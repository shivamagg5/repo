// =============================================================================
// Scanner Mobile — Device Key Management & Request Authentication Service
// Generates local ECDSA P-256 (secp256r1) keypair with PointyCastle,
// stores private key strictly in secure storage, and signs API requests for DeviceAuthGuard.
// =============================================================================

import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:pointycastle/export.dart';

class DeviceKeyService {
  final FlutterSecureStorage _storage;

  static const _keyDeviceId = 'scanner_registered_device_id';
  static const _keyDevicePrivateKey = 'scanner_device_private_key_hex';
  static const _keyDevicePublicKeyPem = 'scanner_device_public_key_pem';

  DeviceKeyService({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  /// Retrieve existing registered device ID or null.
  Future<String?> getRegisteredDeviceId() async {
    return _storage.read(key: _keyDeviceId);
  }

  /// Check if device has an existing keypair in secure storage.
  Future<bool> hasKeyPair() async {
    final priv = await _storage.read(key: _keyDevicePrivateKey);
    return priv != null && priv.isNotEmpty;
  }

  /// Get the device's public key PEM string for registration.
  Future<String?> getPublicKeyPem() async {
    return _storage.read(key: _keyDevicePublicKeyPem);
  }

  /// Generate and store a new local ECDSA P-256 keypair in secure storage.
  /// The private key NEVER leaves the device.
  Future<String> generateAndStoreKeyPair() async {
    final domain = ECCurve_secp256r1();
    final keyParams = ECKeyGeneratorParameters(domain);
    final secureRandom = FortunaRandom();
    final seed = Uint8List.fromList(List<int>.generate(32, (_) => Random.secure().nextInt(256)));
    secureRandom.seed(KeyParameter(seed));

    final generator = ECKeyGenerator();
    generator.init(ParametersWithRandom(keyParams, secureRandom));

    final pair = generator.generateKeyPair();
    final privateKey = pair.privateKey;
    final publicKey = pair.publicKey;

    final privHex = privateKey.d!.toRadixString(16).padLeft(64, '0');
    final pubBytes = publicKey.Q!.getEncoded(false); // uncompressed 0x04 || X || Y
    final pubBase64 = base64.encode(pubBytes);
    final publicKeyPem = '-----BEGIN PUBLIC KEY-----\n$pubBase64\n-----END PUBLIC KEY-----';

    await _storage.write(key: _keyDevicePrivateKey, value: privHex);
    await _storage.write(key: _keyDevicePublicKeyPem, value: publicKeyPem);

    return publicKeyPem;
  }

  /// Save the server-issued device ID after registration.
  Future<void> saveRegisteredDeviceId(String deviceId) async {
    await _storage.write(key: _keyDeviceId, value: deviceId);
  }

  /// Generate DeviceAuthGuard request headers:
  /// X-Device-Id: [deviceId]
  /// X-Device-Timestamp: [ISO-8601]
  /// X-Device-Signature: [base64url signature of canonical string]
  ///
  /// Canonical string = deviceId|timestamp|method|path
  Future<Map<String, String>> generateAuthHeaders({
    required String method,
    required String path,
    String? timestampOverride,
  }) async {
    final deviceId = await getRegisteredDeviceId();
    final privHex = await _storage.read(key: _keyDevicePrivateKey);

    if (deviceId == null || privHex == null) {
      return {};
    }

    final timestamp = timestampOverride ?? DateTime.now().toUtc().toIso8601String();
    final canonicalStr = '$deviceId|$timestamp|${method.toUpperCase()}|$path';

    final domain = ECCurve_secp256r1();
    final privKey = ECPrivateKey(BigInt.parse(privHex, radix: 16), domain);

    final signer = ECDSASigner(SHA256Digest(), HMac(SHA256Digest(), 64));
    signer.init(true, PrivateKeyParameter(privKey));

    final sig = signer.generateSignature(Uint8List.fromList(utf8.encode(canonicalStr))) as ECSignature;

    // Convert (r, s) to raw 64-byte format
    final rBytes = _bigIntToBytes(sig.r, 32);
    final sBytes = _bigIntToBytes(sig.s, 32);
    final rawSigBytes = [...rBytes, ...sBytes];

    final sigBase64Url = base64Url.encode(rawSigBytes).replaceAll('=', '');

    return {
      'X-Device-Id': deviceId,
      'X-Device-Timestamp': timestamp,
      'X-Device-Signature': sigBase64Url,
    };
  }

  Uint8List _bigIntToBytes(BigInt number, int byteLength) {
    var hex = number.toRadixString(16);
    if (hex.length % 2 != 0) hex = '0$hex';
    final bytes = <int>[];
    for (var i = 0; i < hex.length; i += 2) {
      bytes.add(int.parse(hex.substring(i, i + 2), radix: 16));
    }
    if (bytes.length < byteLength) {
      return Uint8List.fromList([...List.filled(byteLength - bytes.length, 0), ...bytes]);
    } else if (bytes.length > byteLength) {
      return Uint8List.fromList(bytes.sublist(bytes.length - byteLength));
    }
    return Uint8List.fromList(bytes);
  }

  /// Clear device identity on revocation or reset.
  Future<void> clearDeviceIdentity() async {
    await _storage.delete(key: _keyDeviceId);
    await _storage.delete(key: _keyDevicePrivateKey);
    await _storage.delete(key: _keyDevicePublicKeyPem);
  }
}
