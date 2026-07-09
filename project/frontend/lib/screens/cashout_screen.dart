import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../main.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../widgets/widgets.dart';
import 'send_screen.dart' show _SectionCard;

class CashoutScreen extends StatefulWidget {
  const CashoutScreen({super.key});

  @override
  State<CashoutScreen> createState() => _CashoutScreenState();
}

class _CashoutScreenState extends State<CashoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountCtrl = TextEditingController();
  final _bankNameCtrl = TextEditingController();
  final _accountCtrl = TextEditingController();
  final _routingCtrl = TextEditingController();

  int _category = 0;
  bool _submitting = false;
  String? _error;

  WalletModel? _wallet;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments as Map?;
    _wallet = args?['wallet'] as WalletModel?;
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _bankNameCtrl.dispose();
    _accountCtrl.dispose();
    _routingCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _submitting = true; _error = null; });

    final bankRef = '${_bankNameCtrl.text.trim()}|${_accountCtrl.text.trim()}|${_routingCtrl.text.trim()}';
    try {
      final res = await ApiService.cashout(
        fromAddress: _wallet!.address,
        amount: _amountCtrl.text.trim(),
        bankRef: bankRef,
        category: _category,
      );
      setState(() => _submitting = false);
      if (mounted) _showSuccess(res);
    } catch (e) {
      setState(() { _error = e.toString(); _submitting = false; });
    }
  }

  void _showSuccess(Map<String, dynamic> res) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64, height: 64,
              decoration: const BoxDecoration(color: AppTheme.successLight, shape: BoxShape.circle),
              child: const Icon(Icons.check_rounded, color: AppTheme.success, size: 36),
            ).animate().scale(begin: const Offset(0.5, 0.5), duration: 400.ms, curve: Curves.elasticOut),
            const SizedBox(height: 16),
            const Text('Cashout Submitted!', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(
              'Your request for \$${_amountCtrl.text} USDC has been locked on-chain and sent to our partner for bank settlement.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppTheme.neutral),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(8)),
              child: Row(
                children: [
                  const Icon(Icons.receipt_long_rounded, size: 14, color: AppTheme.neutral),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'TX: ${(res['txHash'] as String? ?? '').isNotEmpty ? '${(res['txHash'] as String).substring(0, 12)}...' : 'Processing'}',
                      style: const TextStyle(fontSize: 12, color: AppTheme.neutral),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Cash Out to Bank'),
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
              // Partner banner
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppTheme.accent.withOpacity(0.15), AppTheme.primary.withOpacity(0.08)],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.accent.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.hub_rounded, color: AppTheme.accent, size: 24),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Global Partner Network', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          Text('Single abstraction for 150+ countries', style: TextStyle(color: AppTheme.neutral, fontSize: 12)),
                        ],
                      ),
                    ),
                    const Text('via NexPay', style: TextStyle(color: AppTheme.accent, fontSize: 11, fontWeight: FontWeight.w600)),
                  ],
                ),
              ).animate().fadeIn(),
              const SizedBox(height: 20),

              if (_wallet != null) ...[
                _SectionCard(
                  title: 'FROM WALLET',
                  child: Row(
                    children: [
                      const Icon(Icons.account_circle_rounded, color: AppTheme.primary, size: 32),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_wallet!.label, style: const TextStyle(fontWeight: FontWeight.w600)),
                            Text(_wallet!.shortAddress, style: const TextStyle(color: AppTheme.neutral, fontSize: 12)),
                          ],
                        ),
                      ),
                      Text(
                        '\$${double.tryParse(_wallet!.usdcBalance)?.toStringAsFixed(2) ?? '0.00'} USDC',
                        style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 50.ms),
                const SizedBox(height: 16),
              ],

              _SectionCard(
                title: 'CASHOUT AMOUNT (USDC)',
                child: Row(
                  children: [
                    const Text('\$', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700)),
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
                          return null;
                        },
                      ),
                    ),
                    const Text('USDC', style: TextStyle(color: AppTheme.neutral, fontWeight: FontWeight.w600)),
                  ],
                ),
              ).animate().fadeIn(delay: 100.ms),
              const SizedBox(height: 16),

              _SectionCard(
                title: 'BANK DETAILS (MOCK)',
                child: Column(
                  children: [
                    TextFormField(
                      controller: _bankNameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Bank Name',
                        hintText: 'e.g. Chase, BPI, HDFC',
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        fillColor: Colors.transparent,
                      ),
                      validator: (v) => v == null || v.trim().isEmpty ? 'Bank name required' : null,
                    ),
                    const Divider(height: 1),
                    TextFormField(
                      controller: _accountCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Account Number',
                        hintText: '1234 5678 9012',
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        fillColor: Colors.transparent,
                      ),
                      validator: (v) => v == null || v.trim().isEmpty ? 'Account number required' : null,
                    ),
                    const Divider(height: 1),
                    TextFormField(
                      controller: _routingCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Routing / SWIFT / IBAN',
                        hintText: 'e.g. 021000021 or CHASUS33',
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        fillColor: Colors.transparent,
                      ),
                      validator: (v) => v == null || v.trim().isEmpty ? 'Routing/SWIFT required' : null,
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 150.ms),
              const SizedBox(height: 16),

              _SectionCard(
                title: 'COMPLIANCE CATEGORY',
                child: CategorySelector(
                  selectedCategory: _category,
                  onChanged: (v) => setState(() => _category = v),
                ),
              ).animate().fadeIn(delay: 200.ms),
              const SizedBox(height: 16),

              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.warning.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.warning.withOpacity(0.25)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded, color: AppTheme.warning, size: 16),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'USDC will be locked on-chain. Partner settles to bank in 1-2 business days. This is a demo flow.',
                        style: TextStyle(color: AppTheme.warning, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 250.ms),
              const SizedBox(height: 16),

              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.errorLight,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.error.withOpacity(0.3)),
                  ),
                  child: Text(_error!, style: const TextStyle(color: AppTheme.error, fontSize: 13)),
                ),
                const SizedBox(height: 16),
              ],

              OutlinedButton(
                onPressed: _submitting ? null : _submit,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 54),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  side: const BorderSide(color: AppTheme.accent, width: 2),
                  foregroundColor: AppTheme.accent,
                ),
                child: _submitting
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accent))
                    : const Text('Cash Out to Bank (via partner)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              ).animate().fadeIn(delay: 300.ms),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
