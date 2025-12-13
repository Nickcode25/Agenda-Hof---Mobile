# AgendaHOF Mobile

Versão mobile simplificada do AgendaHOF, focada em Agenda e Pacientes.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase (backend compartilhado)
- Capacitor (app nativo iOS/Android)

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha com a Anon Key do seu projeto Supabase:

```
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:5173` no navegador.

## Build para iOS

### Pré-requisitos

- macOS
- Xcode instalado
- Conta Apple Developer ($99/ano para publicar na App Store)

### Passos

```bash
# Build do projeto web
npm run build

# Sincronizar com Capacitor
npx cap sync

# Abrir no Xcode
npx cap open ios
```

No Xcode:
1. Selecione seu dispositivo ou simulador
2. Clique em "Run" (▶️)

## Estrutura do projeto

```
src/
├── components/
│   ├── layout/      # Header, BottomNav
│   └── ui/          # Avatar, Loading, etc
├── contexts/
│   └── AuthContext  # Autenticação
├── lib/
│   └── supabase.ts  # Cliente Supabase
├── pages/
│   ├── Agenda.tsx
│   ├── Patients.tsx
│   ├── PatientDetails.tsx
│   ├── Settings.tsx
│   └── Login.tsx
├── types/
│   └── database.ts  # Types do Supabase
├── App.tsx
└── main.tsx
```

## Próximos passos

- [ ] Criar novo agendamento
- [ ] Editar paciente
- [ ] Notificações push (lembretes)
- [ ] Modo offline (cache local)
- [ ] Fotos do paciente
