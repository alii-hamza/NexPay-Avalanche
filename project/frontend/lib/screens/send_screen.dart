import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../main.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../widgets/widgets.dart';

class SendScreen extends StatefulWidget {
  const SendScreen({super.key});

  @override
  State<SendScreen> createState() => _SendScreenState();
}

class _SendScreenState extends State<SendScreen> {
  final _formKey = GlobalKey<FormState>();
  final _toCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _memoCtrl = TextEditingController();

  int _category = 0;
  bool _sending = false;
  bool _showConfirm = false;
  String? _txResult;
  String? _error;

  WalletModel? _fromWallet;
  List<WalletModel> _wallets = [];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments as Map?;
    if (args != null) {
      _fromWallet = args['wallet'] as WalletModel?;
      _wallets = (args['wallets'] as List?)?.cast<WalletModel>() ?? [];
    }
  }

  @override
  void dispose() {
    _toCtrl.dispose();
    _amountCtrl.dispose();
    _memoCtrl.dispose();
    super.dispose();
  }

  void _selectQuickRecipient(WalletModel w) {
    setState(() => _toCtrl.text = w.address);
  }

  void _reviewTransfer() {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _showConfirm = true; _error = null; });
  }

  Future<void> _sendTransfer() async {
    setState(() { _sending = true; _error = null; });
    try {
      final start = DateTime.now();
      final res = await ApiService.transfer(
        fromAddress: _fromWallet!.address,
        toAddress: _toCtrl.text.trim(),
        amount: _amountCtrl.text.trim(),
        category: _category,
        memo: _memoCtrl.text.trim(),
      );
      final elapsed = DateTime.now().difference(start).inMilliseconds;
      setState(() {
        _txResult = res['txHash'] as String? ?? '';
        _sending = false;
        _showConfirm = false;
      });
      if (mounted) {
        _showSuccessSheet(elapsed, res);
      }
    } catch (e) {
      setState(() { _error = e.toString(); _sending = false; _showConfirm = false; });
    }
  }

  void _showSuccessSheet(int ms, Map<String, dynamic> res) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => _SuccessSheet(
        txHash: res['txHash'] as String? ?? '',
        amount: _amountCtrl.text.trim(),
        to: _toCtrl.text.trim(),
        categoryLabel: res['categoryLabel'] as String? ?? '',
        ms: ms,
        onDone: () {
          Navigator.pop(context);
          Navigator.pop(context);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Send Instantly'),
        backgroundColor: AppTheme.secondary,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // From wallet
              _SectionCard(
                title: 'FROM',
                child: _fromWallet != null
                    ? Row(
                        children: [
                          const Icon(Icons.account_circle_rounded, color: AppTheme.primary, size: 32),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(_fromWallet!.label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                Text(_fromWallet!.shortAddress, style: const TextStyle(color: AppTheme.neutral, fontSize: 12)),
                              ],
                            ),
                          ),
                          Text(
                            '\$${double.tryParse(_fromWallet!.usdcBalance)?.toStringAsFixed(2) ?? '0.00'}',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: AppTheme.primary),
                          ),
                        ],
                      )
                    : const Text('No wallet selected'),
              ).animate().fadeIn(),
              const SizedBox(height: 16),

              // Quick recipients
              if (_wallets.length > 1) ...[
                const Text('Quick Select Recipient', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.neutral)),
                const SizedBox(height: 8),
                SizedBox(
                  height: 40,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: _wallets
                        .where((w) => w.address != _fromWallet?.address)
                        .map((w) => GestureDetector(
                              onTap: () => _selectQuickRecipient(w),
                              child: Container(
                                margin: const EdgeInsets.only(right: 8),
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                decoration: BoxDecoration(
                                  color: _toCtrl.text == w.address ? AppTheme.primary.withOpacity(0.1) : AppTheme.surfaceWhite,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: _toCtrl.text == w.address ? AppTheme.primary : AppTheme.neutralLight,
                                  ),
                                ),
                                child: Center(
                                  child: Row(
                                    children: [
                                      if (w.kycVerified) const Icon(Icons.verified_rounded, size: 12, color: AppTheme.accent),
                                      if (w.kycVerified) const SizedBox(width: 4),
                                      Text(w.label.split(' ').first, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                                    ],
                                  ),
                                ),
                              ),
                            ))
                        .toList(),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // To address
              _SectionCard(
                title: 'TO ADDRESS',
                child: TextFormField(
                  controller: _toCtrl,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    hintText: '0x... wallet address',
                    prefixIcon: Icon(Icons.account_circle_outlined, color: AppTheme.neutral),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    fillColor: Colors.transparent,
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Recipient address required';
                    if (!v.trim().startsWith('0x') || v.trim().length != 42) return 'Invalid Ethereum address';
                    if (v.trim().toLowerCase() == _fromWallet?.address.toLowerCase()) return 'Cannot send to yourself';
                    return null;
                  },
                ),
              ).animate().fadeIn(delay: 50.ms),
              const SizedBox(height: 16),

              // Amount
              _SectionCard(
                title: 'AMOUNT (USDC)',
                child: Row(
                  children: [
                    const Text('\$', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: AppTheme.neutralDark)),
                    const SizedBox(width: 4),
                    Expanded(
                      child: TextFormField(
                        controller: _amountCtrl,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
                        decoration: const InputDecoration(
                          hintText: '0.00',
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          fillColor: Colors.transparent,
                        ),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Amount required';
                          final n = double.tryParse(v.trim());
                          if (n == null || n <= 0) return 'Enter a valid amount';
                          final bal = double.tryParse(_fromWallet?.usdcBalance ?? '0') ?? 0;
                          if (n > bal) return 'Insufficient balance';
                          return null;
                        },
                      ),
                    ),
                    const Text('USDC', style: TextStyle(color: AppTheme.neutral, fontWeight: FontWeight.w600)),
                  ],
                ),
              ).animate().fadeIn(delay: 100.ms),
              const SizedBox(height: 16),

              // Category
              _SectionCard(
                title: 'COMPLIANCE CATEGORY',
                child: CategorySelector(
                  selectedCategory: _category,
                  onChanged: (v) => setState(() => _category = v),
                ),
              ).animate().fadeIn(delay: 150.ms),
              const SizedBox(height: 16),

              // Memo
              _SectionCard(
                title: 'MEMO (OPTIONAL)',
                child: TextFormField(
                  controller: _memoCtrl,
                  decoration: const InputDecoration(
                    hintText: 'e.g. Monthly family support',
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    fillColor: Colors.transparent,
                  ),
                ),
              ).animate().fadeIn(delay: 200.ms),
              const SizedBox(height: 20),

              // Fee info
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.primary.withOpacity(0.15)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.local_gas_station_rounded, color: AppTheme.primary, size: 18),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Estimated fee: ~0.001 AVAX  |  Finality: ~1 second',
                        style: TextStyle(color: AppTheme.primary, fontSize: 13, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 250.ms),
              const SizedBox(height: 16),

              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.errorLight,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.error.withOpacity(0.3)),
                  ),
                  child: Text(_error!, style: const TextStyle(color: AppTheme.error, fontSize: 13)),
                ),
              if (_error != null) const SizedBox(height: 16),

              ElevatedButton(
                onPressed: _sending ? null : _reviewTransfer,
                child: _sending
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Review Transfer'),
              ).animate().fadeIn(delay: 300.ms),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
      // Confirmation bottom sheet overlay
      bottomSheet: _showConfirm ? _buildConfirmSheet() : null,
    );
  }

  Widget _buildConfirmSheet() {
    final catLabels = ['Personal Remittance', 'Freelancer Payment', 'Wallet Transfer'];
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: AppTheme.surfaceWhite,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20, offset: Offset(0, -4))],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.send_rounded, color: AppTheme.primary),
              const SizedBox(width: 10),
              const Text('Confirm Transfer', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const Spacer(),
              IconButton(icon: const Icon(Icons.close), onPressed: () => setState(() => _showConfirm = false)),
            ],
          ),
          const Divider(),
          const SizedBox(height: 8),
          _ConfirmRow('From', _fromWallet?.shortAddress ?? ''),
          _ConfirmRow('To', '${_toCtrl.text.substring(0, 6)}...${_toCtrl.text.substring(_toCtrl.text.length - 4)}'),
          _ConfirmRow('Amount', '\$${_amountCtrl.text} USDC'),
          _ConfirmRow('Category', catLabels[_category]),
          _ConfirmRow('Gas Fee', '~0.001 AVAX'),
          _ConfirmRow('Network', 'Avalanche Fuji'),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _sending ? null : _sendTransfer,
            child: _sending
                ? const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                      SizedBox(width: 10),
                      Text('Sending on-chain...'),
                    ],
                  )
                : const Text('Confirm & Send Now'),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;
  const _SectionCard({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.neutral, letterSpacing: 1)),
        const SizedBox(height: 6),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppTheme.surfaceWhite,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.neutralLight),
          ),
          child: child,
        ),
      ],
    );
  }
}

class _ConfirmRow extends StatelessWidget {
  final String label;
  final String value;
  const _ConfirmRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Text('$label  ', style: const TextStyle(color: AppTheme.neutral, fontSize: 14)),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), textAlign: TextAlign.right)),
        ],
      ),
    );
  }
}

class _SuccessSheet extends StatelessWidget {
  final String txHash;
  final String amount;
  final String to;
  final String categoryLabel;
  final int ms;
  final VoidCallback onDone;

  const _SuccessSheet({
    required this.txHash,
    required this.amount,
    required this.to,
    required this.categoryLabel,
    required this.ms,
    required this.onDone,
  });

  @override
  Widget build(BuildContext context) {
    final shortTo = to.length >= 10 ? '${to.substring(0, 6)}...${to.substring(to.length - 4)}' : to;
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: const BoxDecoration(
        color: AppTheme.surfaceWhite,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 72, height: 72,
            decoration: const BoxDecoration(color: AppTheme.successLight, shape: BoxShape.circle),
            child: const Icon(Icons.check_circle_rounded, color: AppTheme.success, size: 40),
          ).animate().scale(begin: const Offset(0.5, 0.5), duration: 400.ms, curve: Curves.elasticOut),
          const SizedBox(height: 16),
          const Text('Transfer Complete!', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text(
            '\$$amount USDC sent to $shortTo',
            style: const TextStyle(color: AppTheme.neutral, fontSize: 15),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                _InfoRow('Category', categoryLabel),
                _InfoRow('Finality', '${ms}ms'),
                _InfoRow('Network', 'Avalanche Fuji'),
                if (txHash.isNotEmpty)
                  _InfoRow('TX Hash', '${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 6)}'),
              ],
            ),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: onDone,
            child: const Text('Done'),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text('$label  ', style: const TextStyle(color: AppTheme.neutral, fontSize: 13)),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13), textAlign: TextAlign.right)),
        ],
      ),
    );
  }
}
