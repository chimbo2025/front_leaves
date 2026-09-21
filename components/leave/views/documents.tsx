'use client'

import { useState } from 'react'
import { FileText, Lock, Eye, Unlock, Upload, ShieldCheck, Trash2, Plus, HardDrive, FileStack } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtShort, getEmployee, type Document } from '@/lib/leave'
import { useLeave } from '@/components/leave/leave-context'
import {
  SectionHeading,
  Panel,
  EmptyState,
  Avatar,
  Modal,
  TableToolbar,
  RowMenu,
  ConfirmModal,
  SelectInput,
  StatCard,
  Btn,
  Pagination,
  usePaged,
  type RowMenuItem,
} from '@/components/leave/shared'

const DOC_TYPES = ['Medical certificate', 'Antenatal record', 'Birth certificate', 'Study admission letter', 'Study plan', 'Supporting document']

function detectType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['citizencertificate', 'pdf', 'jpg', 'jpeg', 'png'].some((k) => name.toLowerCase().includes(k))) {
    if (/maternity|uzazi|antenatal/i.test(name)) return 'Antenatal record'
    if (/birth|kuzaliwa/i.test(name)) return 'Birth certificate'
    if (/medic|ugonjwa|sick|certificate/i.test(name)) return 'Medical certificate'
    if (/study|masomo|admission/i.test(name)) return 'Study admission letter'
    return 'Supporting document'
  }
  return 'Supporting document'
}

export function DocumentsView() {
  const { requests, addDocument, deleteDocument, typeOf, can } = useLeave()
  const [open, setOpen] = useState(false)
  const [requestId, setRequestId] = useState('')
  const [docName, setDocName] = useState('')
  const [docSize, setDocSize] = useState('')
  const [docType, setDocType] = useState('Medical certificate')
  const [restricted, setRestricted] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [visFilter, setVisFilter] = useState('visible')
  const [detail, setDetail] = useState<{ doc: Document & { requestId: string; requestRef: string; employeeId: string } } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; requestId: string } | null>(null)

  const restrictedVisible = can('documents', 'view_medical_documents')
  const canUploadDocs = can('documents', 'create')
  const canDeleteDocs = can('documents', 'delete')

  const allDocs = requests
    .flatMap((r) => r.documents.map((d) => ({ ...d, requestId: r.id, requestRef: r.ref, employeeId: r.employeeId })))
    .filter((d) => !d.restricted || restrictedVisible)

  const visible = allDocs.filter((d) => {
    if (visFilter === 'visible' && d.restricted) return false
    if (visFilter === 'restricted' && !d.restricted) return false
    if (typeFilter !== 'all' && d.type !== typeFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      d.name.toLowerCase().includes(q) ||
      d.type.toLowerCase().includes(q) ||
      d.requestRef.toLowerCase().includes(q) ||
      getEmployee(d.employeeId).name.toLowerCase().includes(q)
    )
  })
  const paged = usePaged(visible, 8)

  const restrictedCount = allDocs.filter((d) => d.restricted).length
  const visibleCount = allDocs.filter((d) => !d.restricted).length
  const attachable = requests.filter((r) => typeOf(r.leaveTypeId)).length

  const pickFile = (file?: File) => {
    if (!file) return
    setDocName(file.name)
    setDocSize(file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : file.size > 1024 ? `${Math.round(file.size / 1024)} KB` : `${file.size} B`)
    setDocType(detectType(file.name))
    if (/medic|sick|antenatal|birth|study/.test(file.name.toLowerCase())) setRestricted(true)
  }

  const upload = () => {
    if (!requestId || !docName.trim()) return
    addDocument(requestId, docName.trim(), docType, restricted, docSize)
    setDocName('')
    setDocSize('')
    setOpen(false)
  }

  const buildMenu = (d: (typeof allDocs)[number]): RowMenuItem[] => [
    { icon: Eye, label: 'View document details', onClick: () => setDetail({ doc: d }) },
    ...(canDeleteDocs
      ? [{ icon: Trash2, label: 'Delete document', tone: 'danger' as const, onClick: () => setDeleteTarget({ id: d.id, name: d.name, requestId: d.requestId }) }]
      : []),
  ]

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="Document management"
        subtitle="Secure uploads for medical certificates, study admissions, birth-related documentation and approvals. Personal and medical records are restricted to authorized HR users only."
        actions={
          canUploadDocs ? (
            <Btn onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4" /> Upload document
            </Btn>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={FileStack} label="Documents on file" value={allDocs.length} hint="Across all requests" tone="teal" />
        <StatCard icon={Lock} label="Restricted (HR only)" value={restrictedCount} hint="Medical & personal records" tone="rose" />
        <StatCard icon={Eye} label="Visible records" value={visibleCount} hint="Visible to employee" tone="emerald" />
        <StatCard icon={HardDrive} label="Attachable requests" value={requests.length} hint="Requests in the system" tone="sky" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-teal-700 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-foreground">Least-privilege access</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Documents are only visible to HR and the owning employee group by default.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
          <Lock className="w-5 h-5 text-teal-700 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-foreground">Privacy preserved</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Medical and birth records never appear in regional or court-facing views.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
          <Eye className="w-5 h-5 text-teal-700 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-foreground">Audited uploads</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Every upload is attributed and written to the hash-chained audit log.</p>
          </div>
        </div>
      </div>

      <Panel
        title={`Secure documents (${visible.length} visible)`}
        subtitle={restrictedVisible ? 'HR privacy view — restricted medical & birth records visible' : 'Employee view — restricted records are hidden'}
        actions={
          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold', restrictedVisible ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900' : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700')}>
            {restrictedVisible ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {restrictedVisible ? 'Restricted visible' : 'Restricted hidden'}
          </span>
        }
      >
        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search name, type, request…"
          count={visible.length}
          filters={[
            {
              label: 'Document type',
              value: typeFilter,
              onChange: setTypeFilter,
              options: [{ value: 'all', label: 'All types' }, ...DOC_TYPES.map((t) => ({ value: t, label: t }))],
            },
            {
              label: 'Visibility',
              value: visFilter,
              onChange: setVisFilter,
              options: [
                { value: 'all', label: 'All' },
                { value: 'visible', label: 'Visible' },
                ...(restrictedVisible ? [{ value: 'restricted', label: 'Restricted' }] : []),
              ],
            },
          ]}
        />
        {paged.items.length === 0 ? (
          <EmptyState title="No documents match" hint="Adjust the search or filters, or upload a new document." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-5 font-semibold">Document</th>
                  <th className="py-3 px-3 font-semibold">Request</th>
                  <th className="py-3 px-3 font-semibold">Employee</th>
                  <th className="py-3 px-3 font-semibold hidden sm:table-cell">Uploaded</th>
                  <th className="py-3 px-3 font-semibold hidden md:table-cell">Size</th>
                  <th className="py-3 px-3 font-semibold">Access</th>
                  <th className="py-3 px-3 font-semibold text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.items.map((d) => (
                  <tr key={d.id} className="text-[13px] align-middle group">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-teal-700/10 grid place-items-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-teal-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate max-w-[220px]">{d.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{d.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground whitespace-nowrap">{d.requestRef}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Avatar id={d.employeeId} size="sm" />
                        <span className="font-medium text-foreground whitespace-nowrap">{getEmployee(d.employeeId).name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground whitespace-nowrap hidden sm:table-cell">{fmtShort(d.uploadedAt)}</td>
                    <td className="py-3 px-3 text-muted-foreground hidden md:table-cell">{d.size}</td>
                    <td className="py-3 px-3">
                      {d.restricted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900 px-2 py-0.5 text-[10px] font-semibold">
                          <Lock className="w-2.5 h-2.5" /> HR only
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900 px-2 py-0.5 text-[10px] font-semibold">
                          Visible
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <RowMenu items={buildMenu(d)} label="Manage" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={paged.page} pageSize={paged.size} total={paged.total} onPage={paged.setPage} onPageSize={paged.setSize} />
      </Panel>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Upload a document"
        subtitle="Pick a real file — its name and size are captured automatically. Sensitive records default to HR-only visibility."
        size="md"
        footer={
          <Btn onClick={upload} disabled={!requestId || !docName.trim()}>
            <Upload className="w-3.5 h-3.5" /> Secure upload
          </Btn>
        }
      >
        <div className="space-y-4">
          <SelectInput label="Attach to request" value={requestId} onChange={(e) => setRequestId(e.target.value)}>
            <option value="">Select a request…</option>
            {requests.slice(0, 10).map((r) => (
              <option key={r.id} value={r.id}>
                {r.ref} · {getEmployee(r.employeeId).name} · {typeOf(r.leaveTypeId)?.name ?? r.leaveTypeId}
              </option>
            ))}
          </SelectInput>

          <div>
            <label className="text-[12px] font-semibold text-foreground block mb-1.5">File</label>
            <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-input px-4 py-6 cursor-pointer hover:border-teal-600/50 hover:bg-teal-50/40 dark:hover:bg-teal-950/30 transition text-center">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-[12px] font-semibold text-foreground">
                {docName ? docName : 'Choose a file to attach'}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {docSize ? `${docSize} · type auto-detected` : 'PDF, JPEG, PNG or office documents'}
              </span>
              <input
                type="file"
                className="sr-only"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </label>
            {docName && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2 mt-2">
                <FileText className="w-4 h-4 text-teal-700 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-foreground truncate">{docName}</p>
                  <p className="text-[10px] text-muted-foreground">{docSize}</p>
                </div>
                <button type="button" onClick={() => { setDocName(''); setDocSize('') }} className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline">
                  Remove
                </button>
              </div>
            )}
          </div>

          <SelectInput label="Document type" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
          </SelectInput>
          <label className="flex items-center gap-2 text-[12px] text-foreground">
            <input type="checkbox" checked={restricted} onChange={(e) => setRestricted(e.target.checked)} className="accent-teal-700" />
            Restrict to HR only (sensitive)
          </label>
        </div>
      </Modal>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Document details"
        subtitle={detail ? `${detail.doc.name} · ${detail.doc.type}` : ''}
        size="md"
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <DetailCell label="File name" value={detail.doc.name} />
              <DetailCell label="Size" value={detail.doc.size} />
              <DetailCell label="Uploaded by" value={detail.doc.uploadedByLabel} />
              <DetailCell label="Uploaded on" value={fmtShort(detail.doc.uploadedAt)} />
              <DetailCell label="Attached to" value={detail.doc.requestRef} />
              <DetailCell label="Access" value={detail.doc.restricted ? 'Restricted — HR only' : 'Visible to employee'} />
            </div>
            {detail.doc.restricted && restrictedVisible && (
              <p className="text-[11px] text-muted-foreground">Restricted medical/personal records are only shown to holders of the view_medical_documents permission.</p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete document?"
        confirmLabel="Delete"
        message={
          <p>
            <span className="font-semibold text-foreground">{deleteTarget?.name}</span> will be removed from the request.
            The deletion itself is written to the hash-chained audit trail.
          </p>
        }
        onConfirm={() => {
          if (deleteTarget) deleteDocument(deleteTarget.requestId, deleteTarget.id)
        }}
      />
    </div>
  )
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/50 p-3.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-[13px] font-semibold text-foreground mt-1 truncate">{value}</p>
    </div>
  )
}