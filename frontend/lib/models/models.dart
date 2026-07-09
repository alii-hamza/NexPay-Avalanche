class WalletModel {
  final String address;
  final String label;
  final bool kycVerified;
  final String usdcBalance;
  final String createdAt;

  WalletModel({
    required this.address,
    required this.label,
    required this.kycVerified,
    required this.usdcBalance,
    required this.createdAt,
  });

  factory WalletModel.fromJson(Map<String, dynamic> j) => WalletModel(
    address: j['address'] as String,
    label: j['label'] as String,
    kycVerified: j['kyc_verified'] as bool? ?? false,
    usdcBalance: j['usdc_balance'] as String? ?? '0',
    createdAt: j['created_at'] as String? ?? '',
  );

  String get shortAddress => '${address.substring(0, 6)}...${address.substring(address.length - 4)}';
}

class TransferModel {
  final String id;
  final String? txHash;
  final String fromAddress;
  final String toAddress;
  final String amount;
  final int category;
  final String categoryLabel;
  final String memo;
  final String status;
  final String createdAt;
  final String? direction;

  TransferModel({
    required this.id,
    this.txHash,
    required this.fromAddress,
    required this.toAddress,
    required this.amount,
    required this.category,
    required this.categoryLabel,
    required this.memo,
    required this.status,
    required this.createdAt,
    this.direction,
  });

  factory TransferModel.fromJson(Map<String, dynamic> j) => TransferModel(
    id: j['id'] as String,
    txHash: j['tx_hash'] as String?,
    fromAddress: j['from_address'] as String,
    toAddress: j['to_address'] as String,
    amount: j['amount'] as String,
    category: j['category'] as int? ?? 0,
    categoryLabel: j['category_label'] as String? ?? 'WalletTransfer',
    memo: j['memo'] as String? ?? '',
    status: j['status'] as String? ?? 'pending',
    createdAt: j['created_at'] as String? ?? '',
    direction: j['direction'] as String?,
  );

  bool get isSent => direction == 'sent';
  bool get isConfirmed => status == 'confirmed';
  String get shortFrom => '${fromAddress.substring(0, 6)}...${fromAddress.substring(fromAddress.length - 4)}';
  String get shortTo => '${toAddress.substring(0, 6)}...${toAddress.substring(toAddress.length - 4)}';
}

class CashoutModel {
  final String id;
  final String? txHash;
  final String fromAddress;
  final String amount;
  final String bankRef;
  final int category;
  final String status;
  final String createdAt;

  CashoutModel({
    required this.id,
    this.txHash,
    required this.fromAddress,
    required this.amount,
    required this.bankRef,
    required this.category,
    required this.status,
    required this.createdAt,
  });

  factory CashoutModel.fromJson(Map<String, dynamic> j) => CashoutModel(
    id: j['id'] as String,
    txHash: j['tx_hash'] as String?,
    fromAddress: j['from_address'] as String,
    amount: j['amount'] as String,
    bankRef: j['bank_ref'] as String,
    category: j['category'] as int? ?? 0,
    status: j['status'] as String? ?? 'pending',
    createdAt: j['created_at'] as String? ?? '',
  );
}
