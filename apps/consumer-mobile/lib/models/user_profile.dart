// =============================================================================
// UserProfile Model
// Authoritative application user profile returned by GET /api/v1/auth/me
// =============================================================================

class UserProfile {
  final String id;
  final String? email;
  final String name;
  final String? phone;
  final String? avatarUrl;
  final String status;
  final String createdAt;

  const UserProfile({
    required this.id,
    this.email,
    required this.name,
    this.phone,
    this.avatarUrl,
    required this.status,
    required this.createdAt,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    // Backend returns { "data": { ... } } or direct JSON
    final map = json.containsKey('data') && json['data'] is Map<String, dynamic>
        ? json['data'] as Map<String, dynamic>
        : json;

    return UserProfile(
      id: map['id'] as String? ?? '',
      email: map['email'] as String?,
      name: map['name'] as String? ?? 'User',
      phone: map['phone'] as String?,
      avatarUrl: map['avatarUrl'] as String?,
      status: map['status'] as String? ?? 'active',
      createdAt: map['createdAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'phone': phone,
        'avatarUrl': avatarUrl,
        'status': status,
        'createdAt': createdAt,
      };
}
