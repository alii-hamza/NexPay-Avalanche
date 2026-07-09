import 'dart:convert';
import 'package:http/http.dart' as http;

const String _baseUrl = 'https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/nexpay-api';
const String _anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

Map<String, String> get _headers => {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer $_anonKey',
  'Apikey': _anonKey,
};

class ApiService {
  static Future<Map<String, dynamic>> getWallets() async {
    final res = await http.get(Uri.parse('$_baseUrl/wallets'), headers: _headers);
    return _parse(res);
  }

  static Future<Map<String, dynamic>> getBalance(String address) async {
    final res = await http.get(Uri.parse('$_baseUrl/balance/$address'), headers: _headers);
    return _parse(res);
  }

  static Future<Map<String, dynamic>> getTransfers(String address) async {
    final res = await http.get(Uri.parse('$_baseUrl/transfers/$address'), headers: _headers);
    return _parse(res);
  }

  static Future<Map<String, dynamic>> transfer({
    required String fromAddress,
    required String toAddress,
    required String amount,
    required int category,
    String memo = '',
  }) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/transfer'),
      headers: _headers,
      body: jsonEncode({
        'fromAddress': fromAddress,
        'toAddress': toAddress,
        'amount': amount,
        'category': category,
        'memo': memo,
      }),
    );
    return _parse(res);
  }

  static Future<Map<String, dynamic>> cashout({
    required String fromAddress,
    required String amount,
    required String bankRef,
    int category = 0,
  }) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/cashout'),
      headers: _headers,
      body: jsonEncode({
        'fromAddress': fromAddress,
        'amount': amount,
        'bankRef': bankRef,
        'category': category,
      }),
    );
    return _parse(res);
  }

  static Future<Map<String, dynamic>> verifyKyc(String address) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/kyc/verify'),
      headers: _headers,
      body: jsonEncode({'address': address}),
    );
    return _parse(res);
  }

  static Future<Map<String, dynamic>> onramp({
    required String address,
    required String amount,
    String currency = 'USD',
  }) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/onramp'),
      headers: _headers,
      body: jsonEncode({'address': address, 'amount': amount, 'currency': currency}),
    );
    return _parse(res);
  }

  static Future<Map<String, dynamic>> seed() async {
    final res = await http.post(Uri.parse('$_baseUrl/seed'), headers: _headers);
    return _parse(res);
  }

  static Future<Map<String, dynamic>> health() async {
    final res = await http.get(Uri.parse('$_baseUrl/health'), headers: _headers);
    return _parse(res);
  }

  static Map<String, dynamic> _parse(http.Response res) {
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400) {
      throw ApiException(body['error'] as String? ?? 'Unknown error', res.statusCode);
    }
    return body;
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;
  ApiException(this.message, this.statusCode);

  @override
  String toString() => message;
}
