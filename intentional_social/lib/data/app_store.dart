import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

abstract class AppStore {
  Future<Map<String, dynamic>?> read();
  Future<void> write(Map<String, dynamic> value);
}

class LocalAppStore implements AppStore {
  final SharedPreferencesAsync _preferences = SharedPreferencesAsync();
  static const key = 'chrysalis.intentional.v1';
  @override
  Future<Map<String, dynamic>?> read() async {
    final raw = await _preferences.getString(key);
    return raw == null ? null : jsonDecode(raw) as Map<String, dynamic>;
  }

  @override
  Future<void> write(Map<String, dynamic> value) =>
      _preferences.setString(key, jsonEncode(value));
}
