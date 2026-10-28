/**
 * SignatureProfileService - Frontend
 * Manages saved signature profiles on the client side
 */

import { leaveApi } from '@/lib/leave-api'

export interface SignatureProfile {
  id: string
  user_id: string
  signature_path: string
  signature_hash: string
  original_filename: string | null
  mime_type: string
  is_default: boolean
  verified_at: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateSignatureProfileInput {
  is_default?: boolean
}

class SignatureProfileService {
  private baseUrl = '/api/signatures/profile'

  async createProfile(
    file: File,
    isDefault = false
  ): Promise<SignatureProfile> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('is_default', String(isDefault))

    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || 'Failed to create signature profile')
    }

    return response.json()
  }

  async getProfiles(): Promise<SignatureProfile[]> {
    const response = await fetch(`${this.baseUrl}`, {
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch signature profiles')
    }

    return response.json()
  }

  async getDefaultProfile(): Promise<SignatureProfile | null> {
    try {
      const profiles = await this.getProfiles()
      return profiles.find(p => p.is_default) || null
    } catch {
      return null
    }
  }

  async getProfile(profileId: string): Promise<SignatureProfile | null> {
    const response = await fetch(`${this.baseUrl}/${profileId}`, {
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
    })

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error('Failed to fetch signature profile')
    }

    return response.json()
  }

  async setDefault(profileId: string): Promise<SignatureProfile> {
    const response = await fetch(`${this.baseUrl}/${profileId}/default`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to set default signature profile')
    }

    return response.json()
  }

  async revokeProfile(profileId: string): Promise<SignatureProfile> {
    const response = await fetch(`${this.baseUrl}/${profileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to revoke signature profile')
    }

    return response.json()
  }

  async verifyProfile(profileId: string): Promise<{ valid: boolean }> {
    const response = await fetch(`${this.baseUrl}/${profileId}/verify`, {
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to verify signature profile')
    }

    return response.json()
  }

  private getToken(): string {
    // Get token from localStorage or auth context
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || ''
    }
    return ''
  }
}

export const signatureProfileService = new SignatureProfileService()