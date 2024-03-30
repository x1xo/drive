// place files you want to import through the `$lib` alias in this folder.
import {customAlphabet} from 'nanoid'

export const randomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 10)

export type UserSession = {
    userId: string,
    userAgent: string,
    ipAddress: string,
    createdAt: Date,
    expiresAt: Date,
}