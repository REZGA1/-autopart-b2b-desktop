import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Layout from '@/components/common/Layout'
import UserPageHeader from '@/components/common/UserPageHeader'
import ValidatedBadge from '@/components/common/ValidatedBadge'
import { useAuth } from '@/stores/authStore'
import { profileFormSchema } from '@/schemas/profileFormSchema'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const MAX_BYTES = 5 * 1024 * 1024
const AVATAR_TYPES = /^image\/(jpeg|png|webp)$/
const DOC_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

function buildDefaults(p) {
  return {
    first_name: p?.first_name || '',
    last_name: p?.last_name || '',
    phone: p?.phone || '',
    company_name: p?.company_name || '',
    address: p?.address || '',
    business_email: p?.business_email || '',
    business_phone: p?.business_phone || '',
    rc_number: p?.rc_number || '',
    nif_number: p?.nif_number || '',
  }
}

export default function ProfilePage() {
  const {
    profile,
    allowDocumentReupload,
    updateProfile,
    uploadAvatar,
    uploadDocument,
  } = useAuth()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [rcFile, setRcFile] = useState(null)
  const [idFile, setIdFile] = useState(null)

  const avatarInputRef = useRef(null)
  const rcInputRef = useRef(null)
  const idInputRef = useRef(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: buildDefaults(profile),
  })

  useEffect(() => {
    if (profile) reset(buildDefaults(profile))
  }, [profile, reset])

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  function clearAvatarPick() {
    setAvatarFile(null)
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  async function onSave(values) {
    setMsg('')
    setErr('')
    setBusy(true)
    try {
      const payload = {}
      Object.keys(values).forEach((k) => {
        payload[k] = values[k] === '' ? null : values[k]
      })
      await updateProfile(payload)
      setMsg('Saved')
      setEditing(false)
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  function onCancelEdit() {
    reset(buildDefaults(profile))
    setEditing(false)
    setErr('')
    setMsg('')
  }

  function onPickAvatar(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    setMsg('')
    setErr('')
    if (!f) return
    if (f.size > MAX_BYTES) {
      setErr('Image must be 5MB or smaller')
      return
    }
    if (!AVATAR_TYPES.test(f.type)) {
      setErr('Avatar: use JPG, PNG, or WebP')
      return
    }
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
    setAvatarFile(f)
  }

  async function onConfirmAvatar() {
    if (!avatarFile) return
    setMsg('')
    setErr('')
    setBusy(true)
    try {
      await uploadAvatar(avatarFile)
      clearAvatarPick()
      setMsg('Avatar uploaded')
    } catch (e) {
      setErr(e?.response?.data?.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  function validateDocFile(f) {
    if (f.size > MAX_BYTES) return 'File must be 5MB or smaller'
    const ok =
      f.type === 'application/pdf' ||
      /^image\/(jpeg|png|webp)$/.test(f.type)
    if (!ok) return 'Use PDF, JPG, PNG, or WebP'
    return null
  }

  function onPickRc(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    setMsg('')
    setErr('')
    if (!f) return
    const v = validateDocFile(f)
    if (v) {
      setErr(v)
      return
    }
    setRcFile(f)
  }

  function onPickId(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    setMsg('')
    setErr('')
    if (!f) return
    const v = validateDocFile(f)
    if (v) {
      setErr(v)
      return
    }
    setIdFile(f)
  }

  async function onUploadDoc(file, docType, clear) {
    setMsg('')
    setErr('')
    setBusy(true)
    try {
      await uploadDocument(file, docType)
      clear()
      setMsg('Document uploaded')
    } catch (e) {
      const m = e?.response?.data?.message
      setErr(m || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const rcLocked = !!(profile?.rc_image_url && !allowDocumentReupload)
  const idLocked = !!(profile?.id_card_url && !allowDocumentReupload)

  const subtitle = (
    <>
      Role:{' '}
      <span className="font-medium text-slate-900">{profile?.role || '—'}</span>
    </>
  )

  return (
    <Layout title="Profile">
      <div className="space-y-6">
        <UserPageHeader
          profile={profile}
          subtitle={subtitle}
          right={<ValidatedBadge validated={!!profile?.validated} />}
        />

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
            <CardDescription>Business contact info on file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Business Phone:</span>
              <span className="font-medium text-slate-900">{profile?.business_phone || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Business Email:</span>
              <span className="font-medium text-slate-900">{profile?.business_email || '—'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Profile details</CardTitle>
              <CardDescription>
                View-only until you choose Edit. You cannot change business_email from here.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {!editing ? (
                <Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(true)}>
                  Edit
                </Button>
              ) : (
                <>
                  <Button type="button" variant="ghost" disabled={busy} onClick={onCancelEdit}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 text-left">
                  <Label htmlFor="first_name">First name</Label>
                  <Input
                    id="first_name"
                    disabled={!editing || busy}
                    aria-invalid={!!errors.first_name}
                    {...register('first_name')}
                  />
                  {errors.first_name ? (
                    <p className="text-sm text-red-600">{errors.first_name.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="last_name">Last name</Label>
                  <Input
                    id="last_name"
                    disabled={!editing || busy}
                    aria-invalid={!!errors.last_name}
                    {...register('last_name')}
                  />
                  {errors.last_name ? (
                    <p className="text-sm text-red-600">{errors.last_name.message}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 text-left">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" disabled={!editing || busy} {...register('phone')} />
                  {errors.phone ? <p className="text-sm text-red-600">{errors.phone.message}</p> : null}
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="business_phone">Business phone</Label>
                  <Input
                    id="business_phone"
                    disabled={!editing || busy}
                    aria-invalid={!!errors.business_phone}
                    {...register('business_phone')}
                  />
                  {errors.business_phone ? (
                    <p className="text-sm text-red-600">{errors.business_phone.message}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2 text-left">
                <Label htmlFor="company_name">Company name</Label>
                <Input id="company_name" disabled={!editing || busy} {...register('company_name')} />
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="address">Address</Label>
                <Input id="address" disabled={!editing || busy} {...register('address')} />
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="business_email">Business Email</Label>
                <Input
                  id="business_email"
                  type="email"
                  disabled={!editing || busy}
                  {...register('business_email')}
                />
                {errors.business_email ? (
                  <p className="text-sm text-red-600">{errors.business_email.message}</p>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 text-left">
                  <Label htmlFor="rc_number">RC Number</Label>
                  <Input
                    id="rc_number"
                    disabled={!editing || busy}
                    aria-invalid={!!errors.rc_number}
                    {...register('rc_number')}
                  />
                  {errors.rc_number ? (
                    <p className="text-sm text-red-600">{errors.rc_number.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="nif_number">NIF Number</Label>
                  <Input
                    id="nif_number"
                    disabled={!editing || busy}
                    aria-invalid={!!errors.nif_number}
                    {...register('nif_number')}
                  />
                  {errors.nif_number ? (
                    <p className="text-sm text-red-600">{errors.nif_number.message}</p>
                  ) : null}
                </div>
              </div>

              {err ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}
              {msg ? <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</div> : null}

              {editing ? (
                <Button disabled={busy} type="submit">
                  {busy ? '…' : 'Save changes'}
                </Button>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Avatar</CardTitle>
              <CardDescription>JPG, PNG, or WebP · max 5MB</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border bg-slate-100">
                  {avatarPreview || profile?.avatar_url ? (
                    <img
                      alt=""
                      src={avatarPreview || profile.avatar_url}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">—</div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    ref={avatarInputRef}
                    id="avatar-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={busy}
                    aria-label="Choose avatar image"
                    onChange={onPickAvatar}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 px-3 text-xs"
                    disabled={busy}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    Choose image
                  </Button>
                  {avatarFile ? (
                    <p className="truncate text-xs text-slate-600" title={avatarFile.name}>
                      {avatarFile.name}
                      {' '}
                      (
                      {(avatarFile.size / 1024).toFixed(0)}
                      {' '}
                      KB)
                    </p>
                  ) : null}
                </div>
              </div>
              {avatarFile ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="h-9 px-3 text-xs" disabled={busy} onClick={onConfirmAvatar}>
                    Upload avatar
                  </Button>
                  <Button type="button" className="h-9 px-3 text-xs" variant="ghost" disabled={busy} onClick={clearAvatarPick}>
                    Clear
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">RC document</CardTitle>
              <CardDescription>PDF or image · max 5MB</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile?.rc_image_url ? (
                <a className="text-sm font-medium text-slate-900 underline" href={profile.rc_image_url} target="_blank" rel="noreferrer">
                  Open current file
                </a>
              ) : (
                <div className="text-sm text-slate-600">No file yet</div>
              )}
              {rcLocked ? (
                <p className="text-xs text-slate-600">
                  A document is already on file. Re-upload is disabled unless enabled by the system.
                </p>
              ) : (
                <>
                  <input
                    ref={rcInputRef}
                    id="rc-input"
                    type="file"
                    accept={DOC_ACCEPT}
                    className="hidden"
                    disabled={busy}
                    aria-label="Choose RC document file"
                    onChange={onPickRc}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 px-3 text-xs"
                    disabled={busy}
                    onClick={() => rcInputRef.current?.click()}
                  >
                    Choose file
                  </Button>
                  {rcFile ? (
                    <>
                      <p className="truncate text-xs text-slate-600" title={rcFile.name}>
                        {rcFile.name}
                      </p>
                      <Button
                        type="button"
                        className="h-9 px-3 text-xs"
                        disabled={busy}
                        onClick={() =>
                          onUploadDoc(rcFile, 'rc', () => {
                            setRcFile(null)
                            if (rcInputRef.current) rcInputRef.current.value = ''
                          })}
                      >
                        Upload RC
                      </Button>
                    </>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">ID card</CardTitle>
              <CardDescription>PDF or image · max 5MB</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile?.id_card_url ? (
                <a className="text-sm font-medium text-slate-900 underline" href={profile.id_card_url} target="_blank" rel="noreferrer">
                  Open current file
                </a>
              ) : (
                <div className="text-sm text-slate-600">No file yet</div>
              )}
              {idLocked ? (
                <p className="text-xs text-slate-600">
                  A document is already on file. Re-upload is disabled unless enabled by the system.
                </p>
              ) : (
                <>
                  <input
                    ref={idInputRef}
                    id="id-input"
                    type="file"
                    accept={DOC_ACCEPT}
                    className="hidden"
                    disabled={busy}
                    aria-label="Choose ID card file"
                    onChange={onPickId}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 px-3 text-xs"
                    disabled={busy}
                    onClick={() => idInputRef.current?.click()}
                  >
                    Choose file
                  </Button>
                  {idFile ? (
                    <>
                      <p className="truncate text-xs text-slate-600" title={idFile.name}>
                        {idFile.name}
                      </p>
                      <Button
                        type="button"
                        className="h-9 px-3 text-xs"
                        disabled={busy}
                        onClick={() =>
                          onUploadDoc(idFile, 'id_card', () => {
                            setIdFile(null)
                            if (idInputRef.current) idInputRef.current.value = ''
                          })}
                      >
                        Upload ID
                      </Button>
                    </>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
