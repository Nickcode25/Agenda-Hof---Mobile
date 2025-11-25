import { Contacts, ContactPayload, GetContactsResult } from '@capacitor-community/contacts'
import { Capacitor } from '@capacitor/core'

export interface ContactInfo {
  id: string
  name: string
  phone?: string
  email?: string
}

// Verifica se está rodando em dispositivo nativo
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

// Solicita permissão para acessar contatos
export async function requestContactsPermission(): Promise<boolean> {
  if (!isNativePlatform()) {
    console.warn('Contacts plugin only works on native platforms')
    return false
  }

  try {
    const permission = await Contacts.requestPermissions()
    return permission.contacts === 'granted'
  } catch (error) {
    console.error('Error requesting contacts permission:', error)
    return false
  }
}

// Busca todos os contatos do dispositivo
export async function getDeviceContacts(): Promise<ContactInfo[]> {
  if (!isNativePlatform()) {
    console.warn('Contacts plugin only works on native platforms')
    return []
  }

  try {
    const result: GetContactsResult = await Contacts.getContacts({
      projection: {
        name: true,
        phones: true,
        emails: true,
      },
    })

    const contacts: ContactInfo[] = result.contacts
      .filter((contact: ContactPayload) => contact.name?.display) // Apenas contatos com nome
      .map((contact: ContactPayload) => ({
        id: contact.contactId || crypto.randomUUID(),
        name: contact.name?.display || '',
        phone: contact.phones?.[0]?.number || undefined,
        email: contact.emails?.[0]?.address || undefined,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

    return contacts
  } catch (error) {
    console.error('Error getting contacts:', error)
    throw error
  }
}

// Formata telefone para padrão brasileiro
export function formatPhoneNumber(phone: string): string {
  // Remove tudo que não é número
  const numbers = phone.replace(/\D/g, '')

  // Remove código do país se presente (55)
  let cleanNumber = numbers
  if (cleanNumber.startsWith('55') && cleanNumber.length > 11) {
    cleanNumber = cleanNumber.slice(2)
  }

  // Formata conforme o tamanho
  if (cleanNumber.length === 11) {
    // Celular com DDD: (XX) XXXXX-XXXX
    return `(${cleanNumber.slice(0, 2)}) ${cleanNumber.slice(2, 7)}-${cleanNumber.slice(7)}`
  } else if (cleanNumber.length === 10) {
    // Fixo com DDD: (XX) XXXX-XXXX
    return `(${cleanNumber.slice(0, 2)}) ${cleanNumber.slice(2, 6)}-${cleanNumber.slice(6)}`
  } else if (cleanNumber.length === 9) {
    // Celular sem DDD: XXXXX-XXXX
    return `${cleanNumber.slice(0, 5)}-${cleanNumber.slice(5)}`
  } else if (cleanNumber.length === 8) {
    // Fixo sem DDD: XXXX-XXXX
    return `${cleanNumber.slice(0, 4)}-${cleanNumber.slice(4)}`
  }

  return phone // Retorna original se não conseguir formatar
}
