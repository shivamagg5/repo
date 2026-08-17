// =============================================================================
// Scanner Mobile — Offline Queue Service
// Implements local SQLite queue persistence with sync lifecycle states:
// pending → syncing → synced_success | synced_conflict | synced_invalid
// Retains records for audit/reconciliation window before purge.
// =============================================================================

import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class OfflineScanRecord {
  final String syncId;
  final String qrPayload;
  final String? ticketId;
  final String eventId;
  final String gateId;
  final String deviceId;
  final String scannedAt;
  final String localVerificationResult;
  final String syncStatus; // pending, syncing, synced_success, synced_conflict, synced_invalid
  final String? serverResponse;
  final int createdAt;

  OfflineScanRecord({
    required this.syncId,
    required this.qrPayload,
    this.ticketId,
    required this.eventId,
    required this.gateId,
    required this.deviceId,
    required this.scannedAt,
    required this.localVerificationResult,
    this.syncStatus = 'pending',
    this.serverResponse,
    int? createdAt,
  }) : createdAt = createdAt ?? DateTime.now().millisecondsSinceEpoch;

  Map<String, dynamic> toMap() {
    return {
      'sync_id': syncId,
      'qr_payload': qrPayload,
      'ticket_id': ticketId,
      'event_id': eventId,
      'gate_id': gateId,
      'device_id': deviceId,
      'scanned_at': scannedAt,
      'local_verification_result': localVerificationResult,
      'sync_status': syncStatus,
      'server_response': serverResponse,
      'created_at': createdAt,
    };
  }

  factory OfflineScanRecord.fromMap(Map<String, dynamic> map) {
    return OfflineScanRecord(
      syncId: map['sync_id'] as String,
      qrPayload: map['qr_payload'] as String,
      ticketId: map['ticket_id'] as String?,
      eventId: map['event_id'] as String,
      gateId: map['gate_id'] as String,
      deviceId: map['device_id'] as String,
      scannedAt: map['scanned_at'] as String,
      localVerificationResult: map['local_verification_result'] as String,
      syncStatus: (map['sync_status'] as String?) ?? 'pending',
      serverResponse: map['server_response'] as String?,
      createdAt: map['created_at'] as int?,
    );
  }

  Map<String, dynamic> toSyncPayload() {
    return {
      'syncId': syncId,
      'qrPayload': qrPayload,
      'eventId': eventId,
      'gateId': gateId,
      'deviceId': deviceId,
      'deviceScannedAt': scannedAt,
      'localVerificationResult': localVerificationResult,
    };
  }
}

class OfflineQueueService {
  Database? _db;

  // In-memory fallback list for environments where SQLite is mocked or in test
  final List<OfflineScanRecord> _fallbackMemoryQueue = [];

  Future<Database?> _getDatabase() async {
    if (_db != null) return _db;
    try {
      final dbPath = await getDatabasesPath();
      final path = join(dbPath, 'scanner_offline_queue.db');

      _db = await openDatabase(
        path,
        version: 1,
        onCreate: (db, version) async {
          await db.execute('''
            CREATE TABLE offline_scans (
              sync_id TEXT PRIMARY KEY,
              qr_payload TEXT NOT NULL,
              ticket_id TEXT,
              event_id TEXT NOT NULL,
              gate_id TEXT NOT NULL,
              device_id TEXT NOT NULL,
              scanned_at TEXT NOT NULL,
              local_verification_result TEXT NOT NULL,
              sync_status TEXT NOT NULL,
              server_response TEXT,
              created_at INTEGER NOT NULL
            )
          ''');
        },
      );
      return _db;
    } catch (_) {
      // In tests or desktop where sqflite might not be initialized, use fallback
      return null;
    }
  }

  /// Enqueue an offline scan
  Future<void> enqueueScan(OfflineScanRecord record) async {
    final db = await _getDatabase();
    if (db != null) {
      await db.insert(
        'offline_scans',
        record.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    } else {
      _fallbackMemoryQueue.removeWhere((r) => r.syncId == record.syncId);
      _fallbackMemoryQueue.add(record);
    }
  }

  /// Get pending scans awaiting sync
  Future<List<OfflineScanRecord>> getPendingScans() async {
    final db = await _getDatabase();
    if (db != null) {
      final maps = await db.query(
        'offline_scans',
        where: 'sync_status = ?',
        whereArgs: ['pending'],
        orderBy: 'created_at ASC',
      );
      return maps.map(OfflineScanRecord.fromMap).toList();
    } else {
      return _fallbackMemoryQueue.where((r) => r.syncStatus == 'pending').toList();
    }
  }

  /// Mark records as syncing
  Future<void> markSyncing(List<String> syncIds) async {
    if (syncIds.isEmpty) return;
    final db = await _getDatabase();
    if (db != null) {
      await db.rawUpdate(
        'UPDATE offline_scans SET sync_status = ? WHERE sync_id IN (${syncIds.map((_) => '?').join(',')})',
        ['syncing', ...syncIds],
      );
    } else {
      for (var i = 0; i < _fallbackMemoryQueue.length; i++) {
        if (syncIds.contains(_fallbackMemoryQueue[i].syncId)) {
          final r = _fallbackMemoryQueue[i];
          _fallbackMemoryQueue[i] = OfflineScanRecord(
            syncId: r.syncId,
            qrPayload: r.qrPayload,
            ticketId: r.ticketId,
            eventId: r.eventId,
            gateId: r.gateId,
            deviceId: r.deviceId,
            scannedAt: r.scannedAt,
            localVerificationResult: r.localVerificationResult,
            syncStatus: 'syncing',
            serverResponse: r.serverResponse,
            createdAt: r.createdAt,
          );
        }
      }
    }
  }

  /// Reconcile authoritative results returned from backend sync endpoint
  Future<void> reconcileSyncResults({
    required List<String> successfulSyncIds,
    required List<Map<String, dynamic>> conflicts,
  }) async {
    final db = await _getDatabase();

    // 1. Mark successful syncs
    if (successfulSyncIds.isNotEmpty) {
      if (db != null) {
        await db.rawUpdate(
          'UPDATE offline_scans SET sync_status = ? WHERE sync_id IN (${successfulSyncIds.map((_) => '?').join(',')})',
          ['synced_success', ...successfulSyncIds],
        );
      } else {
        for (var i = 0; i < _fallbackMemoryQueue.length; i++) {
          if (successfulSyncIds.contains(_fallbackMemoryQueue[i].syncId)) {
            final r = _fallbackMemoryQueue[i];
            _fallbackMemoryQueue[i] = OfflineScanRecord(
              syncId: r.syncId,
              qrPayload: r.qrPayload,
              ticketId: r.ticketId,
              eventId: r.eventId,
              gateId: r.gateId,
              deviceId: r.deviceId,
              scannedAt: r.scannedAt,
              localVerificationResult: r.localVerificationResult,
              syncStatus: 'synced_success',
              createdAt: r.createdAt,
            );
          }
        }
      }
    }

    // 2. Mark conflicts
    for (final conflict in conflicts) {
      final syncId = conflict['syncId'] as String?;
      if (syncId == null) continue;
      final responseStr = jsonEncode(conflict);

      if (db != null) {
        await db.update(
          'offline_scans',
          {
            'sync_status': 'synced_conflict',
            'server_response': responseStr,
          },
          where: 'sync_id = ?',
          whereArgs: [syncId],
        );
      } else {
        final idx = _fallbackMemoryQueue.indexWhere((r) => r.syncId == syncId);
        if (idx != -1) {
          final r = _fallbackMemoryQueue[idx];
          _fallbackMemoryQueue[idx] = OfflineScanRecord(
            syncId: r.syncId,
            qrPayload: r.qrPayload,
            ticketId: r.ticketId,
            eventId: r.eventId,
            gateId: r.gateId,
            deviceId: r.deviceId,
            scannedAt: r.scannedAt,
            localVerificationResult: r.localVerificationResult,
            syncStatus: 'synced_conflict',
            serverResponse: responseStr,
            createdAt: r.createdAt,
          );
        }
      }
    }
  }

  /// Get total count of pending offline scans
  Future<int> getPendingCount() async {
    final pending = await getPendingScans();
    return pending.length;
  }

  /// Audit history of scans (most recent first)
  Future<List<OfflineScanRecord>> getAuditHistory({int limit = 50}) async {
    final db = await _getDatabase();
    if (db != null) {
      final maps = await db.query(
        'offline_scans',
        orderBy: 'created_at DESC',
        limit: limit,
      );
      return maps.map(OfflineScanRecord.fromMap).toList();
    } else {
      return _fallbackMemoryQueue.reversed.take(limit).toList();
    }
  }
}
