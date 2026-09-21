"use client";

import { useState } from "react";
import useSWR from "swr";
import { Search, Filter, Download, Plus, ChevronDown, Mail, Phone, MapPin, Tag, Clock, Edit, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type Contact, type ContactCreate, ApiError } from "@/lib/api";
import { ContactForm } from "@/components/crm/forms/contact-form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const channelColors: Record<string, string> = {
  instagram: "bg-yellow-400/10 text-yellow-400",
  whatsapp: "bg-green-400/10 text-green-400",
  facebook: "bg-blue-400/10 text-blue-400",
  email: "bg-purple-400/10 text-purple-400",
  web: "bg-cyan-400/10 text-cyan-400",
  ads: "bg-orange-400/10 text-orange-400",
  Manual: "bg-slate-400/10 text-slate-400",
};

const lifecycleColors: Record<string, string> = {
  "New Lead": "bg-slate-400/10 text-slate-400",
  Lead: "bg-slate-400/10 text-slate-400",
  MQL: "bg-blue-400/10 text-blue-400",
  Engaged: "bg-blue-400/10 text-blue-400",
  SQL: "bg-yellow-400/10 text-yellow-400",
  Qualified: "bg-yellow-400/10 text-yellow-400",
  Opportunity: "bg-green-400/10 text-green-400",
  Customer: "bg-green-400/10 text-green-400",
  Churned: "bg-red-400/10 text-red-400",
  "Repeat Buyer": "bg-primary/10 text-primary",
  VIP: "bg-amber-400/10 text-amber-400",
};

function getScoreColor(score: number) {
  if (score >= 71) return "text-orange-400 bg-orange-400/10";
  if (score >= 31) return "text-yellow-400 bg-yellow-400/10";
  return "text-blue-400 bg-blue-400/10";
}

function getScoreLabel(score: number): string {
  if (score >= 71) return "hot";
  if (score >= 31) return "warm";
  return "cold";
}

function ContactRow({
  contact,
  onClick,
  isSelected,
  onEdit,
  onDelete,
}: {
  contact: Contact;
  onClick: () => void;
  isSelected: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-border/50 cursor-pointer transition-colors hover:bg-secondary/50 group",
        isSelected && "bg-primary/5"
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
            {contact.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{contact.name}</p>
            <p className="text-xs text-muted-foreground">{contact.company}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={cn("text-xs px-2 py-1 rounded-full font-semibold", getScoreColor(contact.score))}>
          {contact.score}
        </span>
      </td>
      <td className="px-4 py-3">
        <Badge
          className={cn(
            "text-xs border-0 capitalize",
            channelColors[contact.source] ?? "bg-secondary text-muted-foreground"
          )}
        >
          {contact.source}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-muted-foreground">{contact.stage}</span>
      </td>
      <td className="px-4 py-3">
        <Badge
          className={cn("text-xs border-0", lifecycleColors[contact.lifecycle] ?? "bg-secondary text-muted-foreground")}
        >
          {contact.lifecycle}
        </Badge>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-foreground font-medium">${contact.revenue.toLocaleString()}</span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-xs text-muted-foreground">{contact.assigned_agent ?? "-"}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-muted-foreground">{contact.last_contact ?? "-"}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ContactDetail({ contact, onEdit }: { contact: Contact; onEdit: () => void }) {
  const { data: timeline } = useSWR(contact.id ? `contact-timeline-${contact.id}` : null, () =>
    api.contacts.getTimeline(contact.id)
  );

  return (
    <div className="h-full overflow-y-auto">
      {/* Profile header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
              {contact.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{contact.name}</h3>
              <p className="text-xs text-muted-foreground">{contact.company}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-bold", getScoreColor(contact.score))}>
                  {getScoreLabel(contact.score).toUpperCase()} - {contact.score}
                </span>
                <Badge className={cn("text-xs border-0", lifecycleColors[contact.lifecycle])}>{contact.lifecycle}</Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={onEdit}>
            <Edit className="w-3 h-3" /> Edit
          </Button>
        </div>

        {/* Contact info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="w-3.5 h-3.5" />
            <span>{contact.email}</span>
          </div>
          {contact.phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="w-3.5 h-3.5" />
              <span>{contact.phone}</span>
            </div>
          )}
          {contact.location && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>{contact.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Last contact: {contact.last_contact ?? "N/A"}</span>
          </div>
        </div>

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {contact.tags.map((tag) => (
              <Badge key={tag} className="text-[10px] bg-secondary text-muted-foreground border-0">
                <Tag className="w-2.5 h-2.5 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Revenue */}
        <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-xl font-bold text-primary">${contact.revenue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Assigned to {contact.assigned_agent ?? "Unassigned"}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Activity Timeline</p>
        {!timeline || timeline.length === 0 ? (
          <p className="text-xs text-muted-foreground">No events recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {timeline.map((event, i) => (
              <div key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0",
                      event.type === "score_change"
                        ? "bg-orange-400/20 text-orange-400"
                        : event.type === "stage_change"
                          ? "bg-primary/20 text-primary"
                          : event.type === "message"
                            ? "bg-green-400/20 text-green-400"
                            : event.type === "email"
                              ? "bg-purple-400/20 text-purple-400"
                              : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {event.type === "score_change"
                      ? "*"
                      : event.type === "stage_change"
                        ? ">"
                        : event.type === "message"
                          ? "M"
                          : event.type === "email"
                            ? "E"
                            : event.type === "ad_view"
                              ? "A"
                              : "L"}
                  </div>
                  {i < timeline.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="pb-3">
                  <p className="text-xs text-foreground">{event.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{event.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ContactsView() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch contacts from API
  const {
    data: contactsData,
    error,
    isLoading,
    mutate,
  } = useSWR("contacts-list", () => api.contacts.list({ limit: 100 }));

  const contacts = contactsData?.items ?? [];

  const filtered = contacts.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "hot" && c.score >= 71) ||
      (filter === "warm" && c.score >= 31 && c.score < 71) ||
      (filter === "cold" && c.score < 31);
    return matchSearch && matchFilter;
  });

  const handleCreate = async (data: ContactCreate) => {
    setLoading(true);
    try {
      await api.contacts.create(data);
      toast.success("Contact created successfully");
      setFormOpen(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create contact");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: ContactCreate) => {
    if (!editingContact) return;
    setLoading(true);
    try {
      const updated = await api.contacts.update(editingContact.id, data);
      toast.success("Contact updated successfully");
      setEditingContact(null);
      mutate();
      if (selectedContact?.id === updated.id) {
        setSelectedContact(updated);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update contact");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteContact) return;
    setLoading(true);
    try {
      await api.contacts.delete(deleteContact.id);
      toast.success("Contact deleted successfully");
      setDeleteContact(null);
      if (selectedContact?.id === deleteContact.id) {
        setSelectedContact(null);
      }
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete contact");
    } finally {
      setLoading(false);
    }
  };

  const hotCount = contacts.filter((c) => c.score >= 71).length;
  const warmCount = contacts.filter((c) => c.score >= 31 && c.score < 71).length;
  const coldCount = contacts.filter((c) => c.score < 31).length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main table panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="pl-9 h-8 bg-secondary border-border text-sm"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "hot", "warm", "cold"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "ghost"}
                className={cn(
                  "h-7 text-xs capitalize",
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border text-muted-foreground text-xs">
              <Filter className="w-3.5 h-3.5" /> Filter
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border text-muted-foreground text-xs">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-primary text-primary-foreground text-xs"
              onClick={() => setFormOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" /> New Contact
            </Button>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border/50 text-xs text-muted-foreground">
          <span>{filtered.length} contacts</span>
          <span className="w-px h-3 bg-border" />
          <span className="text-orange-400">{hotCount} hot</span>
          <span className="text-yellow-400">{warmCount} warm</span>
          <span className="text-blue-400">{coldCount} cold</span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-sm text-muted-foreground">Loading contacts...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-sm text-destructive">Failed to load contacts. Using demo mode.</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b border-border">
                <tr>
                  {["Contact", "Score", "Source", "Stage", "Lifecycle", "Revenue", "Agent", "Last Contact", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className={cn(
                          "text-left text-xs font-semibold text-muted-foreground px-4 py-2.5",
                          h === "Revenue" && "hidden md:table-cell",
                          h === "Agent" && "hidden lg:table-cell"
                        )}
                      >
                        {h && (
                          <div className="flex items-center gap-1">
                            {h} {h && <ChevronDown className="w-3 h-3" />}
                          </div>
                        )}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact) => (
                  <ContactRow
                    key={contact.id}
                    contact={contact}
                    onClick={() => setSelectedContact(contact)}
                    isSelected={selectedContact?.id === contact.id}
                    onEdit={() => setEditingContact(contact)}
                    onDelete={() => setDeleteContact(contact)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Side detail panel */}
      {selectedContact && (
        <div className="w-72 xl:w-80 border-l border-border bg-card flex-shrink-0 hidden md:flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Details</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground"
              onClick={() => setSelectedContact(null)}
            >
              x
            </Button>
          </div>
          <ContactDetail contact={selectedContact} onEdit={() => setEditingContact(selectedContact)} />
        </div>
      )}

      {/* Create Contact Form */}
      <ContactForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        loading={loading}
        title="New Contact"
      />

      {/* Edit Contact Form */}
      <ContactForm
        open={!!editingContact}
        onClose={() => setEditingContact(null)}
        onSubmit={handleUpdate}
        defaultValues={editingContact ?? undefined}
        loading={loading}
        title="Edit Contact"
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteContact} onOpenChange={(open) => !open && setDeleteContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteContact?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
