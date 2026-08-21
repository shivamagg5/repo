// =============================================================================
// Scanner Mobile — Cryptographic Service
// FIX-004: Real ECDSA P-256 / SHA-256 verification using PointyCastle.
//
// Two-tier offline trust hierarchy:
//   Tier 1: Pinned Root Trust Public Key verifies Event Authorization Package.
//   Tier 2: Server Ticket Verification Key (from package) verifies individual
//           TICKET.v1 QR credentials.
//
// CROSS-LANGUAGE COMPATIBILITY:
//   Backend signs with Node.js `crypto` module, ECDSA P-256, SHA-256, DER encoding.
//   This Dart implementation verifies those exact signatures via PointyCastle.
//   A known test vector is maintained in the corresponding test file.
// =============================================================================

import 'dart:convert';
import 'dart:typed_data';
import 'package:pointycastle/export.dart';
import 'package:asn1lib/asn1lib.dart';

/// Parsed structure of a digital ticket QR token.
class ParsedTicketCredential {
  final String version;
  final String ticketId;
  final String eventId;
  final String ticketTypeId;
  final String issuedAt;
  final String? expiresAt;
  final String keyVersion;
  final String canonicalPayload;
  final String signature;

  ParsedTicketCredential({
    required this.version,
    required this.ticketId,
    required this.eventId,
    required this.ticketTypeId,
    required this.issuedAt,
    this.expiresAt,
    required this.keyVersion,
    required this.canonicalPayload,
    required this.signature,
  });

  bool get isExpired {
    if (expiresAt == null || expiresAt!.isEmpty) return false;
    final exp = DateTime.tryParse(expiresAt!);
    if (exp == null) return false;
    return DateTime.now().toUtc().isAfter(exp);
  }
}

class CryptoService {
  // ---------------------------------------------------------------------------
  // Pinned Root Trust Key — MUST match the root trust key in ScannerCryptoService
  // on the backend. This PEM is embedded at build time; rotation requires an
  // app update. The backend root trust key is generated deterministically for
  // dev/test and must be replaced with a securely generated key for production.
  // ---------------------------------------------------------------------------
  static const String rootTrustPublicKeyPem = '''
-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7Z5f80V274L+JgE66M50E4e4G76M
2M7s07u8+x0+X9w7J5f80V274L+JgE66M50E4e4G76M2M7s07u8+x0+X9w==
-----END PUBLIC KEY-----''';

  static const String rootKeyVersion = 'root-v1-2026';

  // ---------------------------------------------------------------------------
  // PEM → PointyCastle ECPublicKey
  // ---------------------------------------------------------------------------

  /// Parse a PEM-encoded SubjectPublicKeyInfo (EC P-256) to an ECPublicKey.
  ECPublicKey _pemToEcPublicKey(String pem) {
    final lines = pem
        .replaceAll('-----BEGIN PUBLIC KEY-----', '')
        .replaceAll('-----END PUBLIC KEY-----', '')
        .replaceAll('\n', '')
        .replaceAll('\r', '')
        .trim();
    final derBytes = base64.decode(lines);

    // Parse SubjectPublicKeyInfo DER: SEQUENCE { SEQUENCE { OID, OID }, BIT STRING }
    final asn1 = ASN1Parser(Uint8List.fromList(derBytes));
    final topLevel = asn1.nextObject() as ASN1Sequence;
    final bitString = topLevel.elements![1] as ASN1BitString;

    // The bit string content is the uncompressed EC point: 0x04 || X || Y
    final pointBytes = bitString.stringValue!;

    final domainParams = ECDomainParameters('prime256v1');
    final point = domainParams.curve.decodePoint(pointBytes)!;
    return ECPublicKey(point, domainParams);
  }

  // ---------------------------------------------------------------------------
  // DER ECDSA Signature → PointyCastle ECSignature
  // ---------------------------------------------------------------------------

  /// Decode a DER-encoded ECDSA signature (SEQUENCE { INTEGER r, INTEGER s })
  /// from a base64url string.
  ECSignature _base64urlDerToEcSignature(String base64urlSig) {
    // Normalise base64url to standard base64
    String b64 = base64urlSig.replaceAll('-', '+').replaceAll('_', '/');
    while (b64.length % 4 != 0) {
      b64 += '=';
    }
    final derBytes = base64.decode(b64);

    final asn1 = ASN1Parser(Uint8List.fromList(derBytes));
    final seq = asn1.nextObject() as ASN1Sequence;
    final r = (seq.elements![0] as ASN1Integer).valueAsBigInteger!;
    final s = (seq.elements![1] as ASN1Integer).valueAsBigInteger!;
    return ECSignature(r, s);
  }

  // ---------------------------------------------------------------------------
  // Core ECDSA P-256 / SHA-256 Verification
  // ---------------------------------------------------------------------------

  /// Verify an ECDSA P-256 / SHA-256 signature over [message] bytes using
  /// [publicKey]. Returns true only when the signature is cryptographically valid.
  bool _verifyEcdsa(ECPublicKey publicKey, Uint8List messageBytes, ECSignature signature) {
    try {
      final signer = Signer('SHA-256/ECDSA');
      signer.init(false, PublicKeyParameter<ECPublicKey>(publicKey));
      return signer.verifySignature(messageBytes, signature);
    } catch (_) {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Canonicalization Helpers
  // ---------------------------------------------------------------------------

  /// Reconstruct canonical ticket payload string:
  /// v1|ticketId|eventId|ticketTypeId|issuedAt|expiresAt|keyVersion
  String canonicalizeTicketPayload({
    required String ticketId,
    required String eventId,
    required String ticketTypeId,
    required String issuedAt,
    String? expiresAt,
    required String keyVersion,
  }) {
    return 'v1|$ticketId|$eventId|$ticketTypeId|$issuedAt|${expiresAt ?? 'none'}|$keyVersion';
  }

  // ---------------------------------------------------------------------------
  // QR Token Parsing
  // ---------------------------------------------------------------------------

  /// Parse QR Token Structure:
  /// TICKET.{canonicalPayload}.{base64urlSignature}
  ParsedTicketCredential? parseQrToken(String qrToken) {
    if (!qrToken.startsWith('TICKET.')) {
      return null;
    }

    final firstDot = qrToken.indexOf('.');
    final lastDot = qrToken.lastIndexOf('.');
    if (firstDot == -1 || lastDot == -1 || firstDot == lastDot) {
      return null;
    }

    final canonicalPayload = qrToken.substring(firstDot + 1, lastDot);
    final signature = qrToken.substring(lastDot + 1);

    final fields = canonicalPayload.split('|');
    if (fields.length != 7 || fields[0] != 'v1') {
      return null;
    }

    return ParsedTicketCredential(
      version: fields[0],
      ticketId: fields[1],
      eventId: fields[2],
      ticketTypeId: fields[3],
      issuedAt: fields[4],
      expiresAt: fields[5] == 'none' || fields[5].isEmpty ? null : fields[5],
      keyVersion: fields[6],
      canonicalPayload: canonicalPayload,
      signature: signature,
    );
  }

  // ---------------------------------------------------------------------------
  // Tier 1: Event Authorization Package Verification
  // ---------------------------------------------------------------------------

  /// Verify the Event Authorization Package against the pinned Root Trust Key.
  ///
  /// FIX-004: This previously returned `true` unconditionally (structural check only).
  /// It now performs real ECDSA P-256 / SHA-256 verification via PointyCastle.
  ///
  /// The canonical string is the JSON-encoded package fields (excluding
  /// 'packageSignature'), sorted lexicographically by key — matching the
  /// backend's `signEventAuthorizationPackage` implementation.
  bool verifyAuthorizationPackage({
    required Map<String, dynamic> packageData,
    required String packageSignature,
  }) {
    try {
      // 1. Check required fields
      final keyVersion = packageData['keyVersion'] as String?;
      final serverPublicKeyPem = packageData['publicKeyPem'] as String?
          ?? packageData['publicVerificationKeyPem'] as String?;
      if (keyVersion == null || serverPublicKeyPem == null || serverPublicKeyPem.isEmpty) {
        return false;
      }

      // 2. Verify authorization expiry timestamp
      final expiryStr = packageData['authorizationExpiresAt'] as String?;
      if (expiryStr != null && expiryStr.isNotEmpty) {
        final expiresAt = DateTime.tryParse(expiryStr);
        if (expiresAt != null && DateTime.now().toUtc().isAfter(expiresAt)) {
          return false;
        }
      }

      // 3. Reconstruct canonical string (sorted keys, excluding packageSignature)
      final sortedKeys = packageData.keys
          .where((k) => k != 'packageSignature')
          .toList()
        ..sort();
      final Map<String, dynamic> sortedMap = {
        for (var k in sortedKeys) k: packageData[k]
      };
      final canonicalStr = jsonEncode(sortedMap);
      final messageBytes = Uint8List.fromList(utf8.encode(canonicalStr));

      // 4. Parse root trust public key and signature
      final rootPublicKey = _pemToEcPublicKey(rootTrustPublicKeyPem);
      final ecSig = _base64urlDerToEcSignature(packageSignature);

      // 5. REAL ECDSA P-256 / SHA-256 verification against root trust anchor
      return _verifyEcdsa(rootPublicKey, messageBytes, ecSig);
    } catch (_) {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Tier 2: Individual Ticket Credential Verification
  // ---------------------------------------------------------------------------

  /// Verify ticket credential signature against the server key extracted from
  /// the Event Authorization Package.
  ///
  /// FIX-004: This previously returned `credential.signature.length >= 10`.
  /// It now performs real ECDSA P-256 / SHA-256 verification via PointyCastle.
  bool verifyTicketOffline({
    required ParsedTicketCredential credential,
    required String authorizedEventId,
    required String serverTicketPublicKeyPem,
  }) {
    try {
      // 1. Verify Event ID matches the assigned event scope
      if (credential.eventId != authorizedEventId) {
        return false;
      }

      // 2. Verify ticket is not expired
      if (credential.isExpired) {
        return false;
      }

      // 3. Reject structurally invalid credentials immediately
      if (credential.signature.isEmpty || credential.canonicalPayload.isEmpty) {
        return false;
      }

      // 4. Parse server verification public key from the authorization package
      final serverPublicKey = _pemToEcPublicKey(serverTicketPublicKeyPem);

      // 5. Decode the DER ECDSA signature from base64url
      final ecSig = _base64urlDerToEcSignature(credential.signature);

      // 6. REAL ECDSA P-256 / SHA-256 verification of canonical payload
      final messageBytes = Uint8List.fromList(utf8.encode(credential.canonicalPayload));
      return _verifyEcdsa(serverPublicKey, messageBytes, ecSig);
    } catch (_) {
      return false;
    }
  }
}
