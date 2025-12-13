/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cor Principal - Laranja Vibrante
        primary: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#FF6B00', // Laranja principal
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
          950: '#431407',
        },
        // Superfícies e textos
        surface: {
          50: '#FFFFFF',  // Fundo branco
          100: '#EEEEEE', // Cinza claro - bordas e separadores
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#888888', // Cinza médio - texto secundário
          500: '#666666',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#212121', // Preto suave - texto primário
        },
        // Verde WhatsApp - Comunicação
        whatsapp: {
          DEFAULT: '#25D366',
          hover: '#1DA851',
        },
        // Verde Institucional - Sucesso/Concluído
        success: {
          light: '#E8F5E9',
          DEFAULT: '#4CAF50',
          dark: '#388E3C',
        },
        // Status - Agendado (Laranja suave)
        scheduled: {
          light: '#FFF3E0',
          DEFAULT: '#FF9800',
          dark: '#F57C00',
        },
        // Status - Pendente/Alerta (Amarelo suave)
        warning: {
          light: '#FFFDE7',
          DEFAULT: '#FFEB3B',
          dark: '#FBC02D',
        },
        // Status - Erro/Cancelado
        error: {
          light: '#FFEBEE',
          DEFAULT: '#F44336',
          dark: '#D32F2F',
        },
        // Status - Confirmado (Azul)
        info: {
          light: '#E3F2FD',
          DEFAULT: '#2196F3',
          dark: '#1976D2',
        },
        // Cores pastéis para avatares (flat para funcionar com Tailwind)
        'avatar-coral-bg': '#FFCDD2',
        'avatar-coral-text': '#C62828',
        'avatar-peach-bg': '#FFE0B2',
        'avatar-peach-text': '#E65100',
        'avatar-lavender-bg': '#E1BEE7',
        'avatar-lavender-text': '#7B1FA2',
        'avatar-mint-bg': '#C8E6C9',
        'avatar-mint-text': '#2E7D32',
        'avatar-sky-bg': '#BBDEFB',
        'avatar-sky-text': '#1565C0',
        'avatar-lemon-bg': '#FFF9C4',
        'avatar-lemon-text': '#F9A825',
        'avatar-blush-bg': '#F8BBD9',
        'avatar-blush-text': '#AD1457',
        'avatar-sage-bg': '#DCEDC8',
        'avatar-sage-text': '#558B2F',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [],
}
