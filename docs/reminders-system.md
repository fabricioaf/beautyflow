# Sistema de Lembretes Automáticos - BeautyFlow

## Visão Geral

O sistema de lembretes automáticos do BeautyFlow permite enviar notificações automáticas via WhatsApp, Email e SMS para clientes antes de seus agendamentos. O sistema é configurável por profissional e funciona de forma totalmente automática.

## Funcionalidades

### ✅ Recursos Implementados

- **Configuração Flexível**: Cada profissional pode configurar seus próprios horários de lembrete
- **Múltiplos Canais**: WhatsApp, Email e SMS (WhatsApp totalmente implementado)
- **Templates Personalizados**: Sistema de templates com variáveis dinâmicas
- **Agendamento Automático**: Lembretes são agendados automaticamente quando um agendamento é criado
- **Reagendamento Inteligente**: Lembretes são reagendados quando um agendamento é alterado
- **Cancelamento Automático**: Lembretes são cancelados quando um agendamento é cancelado
- **Dashboard de Monitoramento**: Interface completa para visualizar e gerenciar lembretes
- **Estatísticas Detalhadas**: Taxa de sucesso, falhas, pendentes, etc.
- **API Completa**: Endpoints para gerenciar todos os aspectos dos lembretes
- **Cron Job**: Sistema para processar lembretes pendentes

### 🔧 Configuração

#### Configurações de Lembrete por Profissional

```typescript
interface ReminderConfig {
  enabled: boolean                 // Ativar/desativar lembretes
  hoursBeforeAppointment: number[] // Ex: [24, 2] = 24h e 2h antes
  useWhatsApp: boolean            // Enviar via WhatsApp
  useEmail: boolean               // Enviar via Email
  useSMS: boolean                 // Enviar via SMS
  customTemplate?: string         // Template personalizado
}
```

#### Horários Padrão

- **24 horas antes**: Lembrete inicial
- **2 horas antes**: Lembrete de confirmação
- **Personalizável**: Cada profissional pode configurar seus próprios horários

### 📱 Templates de Mensagem

#### Templates Padrão Disponíveis

1. **reminder_24hours**: Lembrete 24h antes
2. **reminder_2hours**: Lembrete 2h antes
3. **confirmation**: Confirmação de agendamento
4. **payment_reminder**: Lembrete de pagamento
5. **welcome**: Boas-vindas para novos clientes
6. **feedback**: Solicitação de feedback
7. **rescheduling**: Notificação de reagendamento
8. **cancellation**: Notificação de cancelamento

#### Variáveis Disponíveis

- `{{clientName}}`: Nome do cliente
- `{{serviceName}}`: Nome do serviço
- `{{appointmentDate}}`: Data do agendamento
- `{{appointmentTime}}`: Horário do agendamento
- `{{professionalName}}`: Nome do profissional
- `{{businessName}}`: Nome do estabelecimento
- `{{hoursBeforeAppointment}}`: Horas antes do agendamento
- `{{price}}`: Preço do serviço

#### Exemplo de Template Personalizado

```
Olá {{clientName}}! 👋

Você tem um agendamento para {{serviceName}} amanhã ({{appointmentDate}}) às {{appointmentTime}} com {{professionalName}}.

💰 Valor: {{price}}
📍 Local: {{businessName}}

Para confirmar ou reagendar, responda esta mensagem.

✨ {{businessName}}
```

### 🚀 Como Usar

#### 1. Configuração Inicial

1. Acesse **Dashboard > Lembretes**
2. Configure os horários de lembrete desejados
3. Escolha os canais de envio (WhatsApp recomendado)
4. Personalize o template se necessário
5. Salve as configurações

#### 2. Funcionamento Automático

- Lembretes são agendados automaticamente quando um agendamento é criado
- O sistema verifica a cada 5 minutos se há lembretes para serem enviados
- Lembretes são enviados nos horários configurados
- Status é atualizado automaticamente (SENT, FAILED, etc.)

#### 3. Monitoramento

- Visualize todos os lembretes na aba "Lembretes"
- Filtre por status, tipo, data
- Acompanhe estatísticas de sucesso
- Monitore falhas e tome ações corretivas

### 📊 Estatísticas

O sistema fornece métricas detalhadas:

- **Total de Lembretes**: Quantidade total enviada
- **Taxa de Sucesso**: Porcentagem de lembretes enviados com sucesso
- **Pendentes**: Lembretes aguardando envio
- **Falharam**: Lembretes que falharam no envio
- **Cancelados**: Lembretes cancelados por mudanças no agendamento

### 🔄 Processamento Automático

#### Cron Job

O sistema inclui um cron job que deve ser executado a cada 5 minutos:

```bash
# Adicionar ao crontab
*/5 * * * * /usr/bin/node /path/to/scripts/process-reminders.js

# Ou usar webhook do Vercel Cron
# Configurar para chamar /api/cron/reminders a cada 5 minutos
```

#### Variáveis de Ambiente

```env
# Token de segurança para o cron (opcional)
CRON_SECRET_TOKEN=your_secret_token_here

# Configurações do WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
```

### 🛠 API Endpoints

#### Lembretes

```typescript
// Listar lembretes
GET /api/reminders?action=list&page=1&limit=20

// Obter estatísticas
GET /api/reminders?action=stats

// Obter configuração
GET /api/reminders?action=config

// Agendar lembretes para um agendamento
POST /api/reminders
{
  "action": "schedule",
  "appointmentId": "string"
}

// Reagendar lembretes
POST /api/reminders
{
  "action": "reschedule",
  "appointmentId": "string"
}

// Cancelar lembretes
POST /api/reminders
{
  "action": "cancel",
  "appointmentId": "string"
}

// Atualizar configuração
POST /api/reminders
{
  "action": "update_config",
  "config": ReminderConfig
}

// Processar lembretes pendentes (admin)
POST /api/reminders
{
  "action": "process_pending"
}
```

#### Cron Job

```typescript
// Processar lembretes pendentes
POST /api/cron/reminders
Headers: {
  "Authorization": "Bearer YOUR_CRON_TOKEN"
}

// Verificar status do cron
GET /api/cron/reminders
```

### 🔒 Segurança

- **Autenticação**: Todos os endpoints requerem autenticação
- **Autorização**: Cada profissional só pode gerenciar seus próprios lembretes
- **Rate Limiting**: WhatsApp API tem limites de taxa que são respeitados
- **Validação**: Todos os dados são validados antes do processamento
- **Logs**: Todas as ações são logadas para auditoria

### 🎯 Benefícios

#### Para o Profissional

- **Redução de No-Shows**: Lembretes automáticos reduzem faltas em até 80%
- **Economia de Tempo**: Não precisa lembrar clientes manualmente
- **Profissionalismo**: Comunicação automática e consistente
- **Análise de Dados**: Métricas para otimizar a comunicação

#### Para o Cliente

- **Conveniência**: Lembretes automáticos no WhatsApp
- **Confirmação Fácil**: Pode confirmar ou reagendar respondendo a mensagem
- **Transparência**: Sempre informado sobre seus agendamentos
- **Experiência Moderna**: Comunicação via canal preferido

### 🚨 Tratamento de Erros

O sistema está preparado para lidar com diversos cenários:

- **WhatsApp Indisponível**: Falhas são registradas e podem ser reenviadas
- **Número Inválido**: Erro é logado e administrador é notificado
- **Limite de Taxa**: Sistema respeita limites da API
- **Agendamento Cancelado**: Lembretes são automaticamente cancelados

### 🔮 Próximas Funcionalidades

- **Email e SMS**: Implementação completa dos canais alternativos
- **Templates Visuais**: Editor visual para criar templates
- **A/B Testing**: Testar diferentes templates e horários
- **Integração com IA**: Templates inteligentes baseados no histórico do cliente
- **Análise Preditiva**: Identificar padrões de resposta dos clientes

### 📝 Changelog

#### v1.0.0 - Sistema Base
- ✅ Configuração de lembretes por profissional
- ✅ Agendamento automático de lembretes
- ✅ Integração completa com WhatsApp Business API
- ✅ Sistema de templates personalizáveis
- ✅ Dashboard de monitoramento
- ✅ API completa para gerenciamento
- ✅ Cron job para processamento automático
- ✅ Estatísticas e métricas detalhadas

## Conclusão

O sistema de lembretes automáticos do BeautyFlow é uma solução completa e robusta que automatiza a comunicação com clientes, reduzindo no-shows e melhorando a experiência geral. Com configurações flexíveis e monitoramento detalhado, os profissionais podem otimizar sua comunicação e focar no que fazem de melhor: atender seus clientes.