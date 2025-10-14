import crypto from 'crypto'

const KEY_CACHE: { key?: Buffer } = {}

const getEncryptionKey = (): Buffer => {
  if (KEY_CACHE.key) return KEY_CACHE.key

  const secret = process.env.ENCRYPTION_KEY
  if (!secret || secret.trim().length === 0) {
    throw new Error('Missing ENCRYPTION_KEY environment variable for encryption')
  }

  // Derive a 32-byte key using SHA-256 to fit AES-256 requirements
  const derivedKey = crypto.createHash('sha256').update(secret).digest()
  KEY_CACHE.key = derivedKey
  return derivedKey
}

export const encryptValue = (plaintext: string): string => {
  if (typeof plaintext !== 'string') {
    throw new TypeError('Value to encrypt must be a string')
  }

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12) // GCM recommended IV length
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('base64'),
    encrypted.toString('base64'),
    authTag.toString('base64'),
  ].join(':')
}

export const decryptValue = (payload: string): string => {
  if (typeof payload !== 'string' || payload.split(':').length !== 3) {
    throw new Error('Invalid encrypted payload format')
  }

  const [ivB64, encryptedB64, authTagB64] = payload.split(':')
  const iv = Buffer.from(ivB64, 'base64')
  const encrypted = Buffer.from(encryptedB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')

  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}
