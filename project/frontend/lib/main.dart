import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'screens/home_screen.dart';
import 'screens/send_screen.dart';
import 'screens/cashout_screen.dart';
import 'screens/activity_screen.dart';
import 'services/api_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const NexPayApp());
}

class NexPayApp extends StatelessWidget {
  const NexPayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NexPay',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      initialRoute: '/',
      routes: {
        '/': (ctx) => const HomeScreen(),
        '/send': (ctx) => const SendScreen(),
        '/cashout': (ctx) => const CashoutScreen(),
        '/activity': (ctx) => const ActivityScreen(),
      },
    );
  }
}

class AppTheme {
  // Color ramps
  static const Color primary = Color(0xFF0052FF);      // Coinbase blue
  static const Color primaryLight = Color(0xFF3D7FFF);
  static const Color primaryDark = Color(0xFF0038B3);
  static const Color secondary = Color(0xFF1A1A2E);
  static const Color secondaryLight = Color(0xFF16213E);
  static const Color accent = Color(0xFF00D395);       // AVAX green-teal
  static const Color accentLight = Color(0xFF33DCAB);
  static const Color success = Color(0xFF00C853);
  static const Color successLight = Color(0xFFE8FFF3);
  static const Color warning = Color(0xFFFF9800);
  static const Color warningLight = Color(0xFFFFF8E1);
  static const Color error = Color(0xFFFF3B30);
  static const Color errorLight = Color(0xFFFFF0EE);
  static const Color neutralDark = Color(0xFF1C1C1E);
  static const Color neutral = Color(0xFF636366);
  static const Color neutralLight = Color(0xFFC7C7CC);
  static const Color surface = Color(0xFFF2F2F7);
  static const Color surfaceWhite = Color(0xFFFFFFFF);
  static const Color avalancheRed = Color(0xFFE84142);

  static ThemeData light() {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        brightness: Brightness.light,
        surface: surface,
      ),
      textTheme: GoogleFonts.interTextTheme().copyWith(
        displayLarge: GoogleFonts.inter(
          fontSize: 32, fontWeight: FontWeight.w700, color: neutralDark,
        ),
        displayMedium: GoogleFonts.inter(
          fontSize: 24, fontWeight: FontWeight.w600, color: neutralDark,
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: 16, fontWeight: FontWeight.w400, color: neutralDark,
        ),
        bodyMedium: GoogleFonts.inter(
          fontSize: 14, fontWeight: FontWeight.w400, color: neutral,
        ),
        labelLarge: GoogleFonts.inter(
          fontSize: 16, fontWeight: FontWeight.w600, color: surfaceWhite,
        ),
      ),
      scaffoldBackgroundColor: surface,
      appBarTheme: AppBarTheme(
        backgroundColor: secondary,
        foregroundColor: surfaceWhite,
        elevation: 0,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 18, fontWeight: FontWeight.w600, color: surfaceWhite,
        ),
      ),
      cardTheme: CardThemeData(
        color: surfaceWhite,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceWhite,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: neutralLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: neutralLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: surfaceWhite,
          minimumSize: const Size(double.infinity, 54),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600),
          elevation: 0,
        ),
      ),
    );
  }
}
