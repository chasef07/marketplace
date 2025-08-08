import { Metadata } from 'next'
import ProfileEdit from '@/components/profile/profile-edit'

export const metadata: Metadata = {
  title: 'Edit Profile',
  description: 'Update your profile information and settings',
}

export default function ProfileEditPage() {
  return <ProfileEdit />
}