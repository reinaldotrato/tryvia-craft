import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Mail,
  Phone,
  Briefcase,
  FileText,
  Trash2,
  Loader2,
  Pencil,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Collaborator {
  id: string;
  tenant_id: string;
  user_id: string | null;
  name: string;
  email: string;
  whatsapp: string | null;
  job_title: string | null;
  description: string | null;
  avatar_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  active: "bg-success/20 text-success",
  inactive: "bg-muted text-muted-foreground",
};

export default function Collaborators() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { effectiveTenantId, isSuperAdmin, role } = usePermissions();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsapp: "",
    job_title: "",
    description: "",
  });

  const canManage = isSuperAdmin || role === "owner" || role === "admin";

  useEffect(() => {
    if (effectiveTenantId) {
      loadCollaborators();
    }
  }, [effectiveTenantId]);

  const loadCollaborators = async () => {
    if (!effectiveTenantId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("collaborators")
        .select("*")
        .eq("tenant_id", effectiveTenantId)
        .order("name", { ascending: true });

      if (error) throw error;

      setCollaborators(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar colaboradores.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      whatsapp: "",
      job_title: "",
      description: "",
    });
    setSelectedCollaborator(null);
    setIsEditing(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (collaborator: Collaborator) => {
    setFormData({
      name: collaborator.name,
      email: collaborator.email,
      whatsapp: collaborator.whatsapp || "",
      job_title: collaborator.job_title || "",
      description: collaborator.description || "",
    });
    setSelectedCollaborator(collaborator);
    setIsEditing(true);
    setIsFormDialogOpen(true);
  };

  const openDeleteDialog = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      toast({
        title: "Erro",
        description: "Nome e e-mail são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (!effectiveTenantId) {
      toast({
        title: "Erro",
        description: "Tenant não encontrado.",
        variant: "destructive",
      });
      return;
    }

    setFormLoading(true);

    try {
      if (isEditing && selectedCollaborator) {
        // Update
        const { error } = await supabase
          .from("collaborators")
          .update({
            name: formData.name,
            email: formData.email,
            whatsapp: formData.whatsapp || null,
            job_title: formData.job_title || null,
            description: formData.description || null,
          })
          .eq("id", selectedCollaborator.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Colaborador atualizado com sucesso!",
        });
      } else {
        // Create
        const { error } = await supabase
          .from("collaborators")
          .insert({
            tenant_id: effectiveTenantId,
            name: formData.name,
            email: formData.email,
            whatsapp: formData.whatsapp || null,
            job_title: formData.job_title || null,
            description: formData.description || null,
            created_by: user?.id,
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Colaborador cadastrado com sucesso!",
        });
      }

      setIsFormDialogOpen(false);
      resetForm();
      loadCollaborators();
    } catch (error: any) {
      console.error("Collaborator error:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar colaborador.",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCollaborator) return;

    setFormLoading(true);

    try {
      const { error } = await supabase
        .from("collaborators")
        .delete()
        .eq("id", selectedCollaborator.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Colaborador removido com sucesso!",
      });

      setIsDeleteDialogOpen(false);
      setSelectedCollaborator(null);
      loadCollaborators();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover colaborador.",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const filteredCollaborators = collaborators.filter(
    (collaborator) =>
      collaborator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      collaborator.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      collaborator.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Colaboradores</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os colaboradores da sua empresa
          </p>
        </div>
        {canManage && (
          <Button
            onClick={openCreateDialog}
            className="bg-gradient-to-r from-purple to-pink hover:opacity-90"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Colaborador
          </Button>
        )}
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="relative max-w-md"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar colaboradores..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-background/50"
        />
      </motion.div>

      {/* Collaborators List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple" />
        </div>
      ) : filteredCollaborators.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum colaborador encontrado</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "Tente uma busca diferente" : "Comece cadastrando colaboradores"}
          </p>
          {!searchQuery && canManage && (
            <Button onClick={openCreateDialog}>
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Colaborador
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {filteredCollaborators.map((collaborator, index) => (
            <motion.div
              key={collaborator.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * index }}
              className="glass-card p-5 hover:border-purple/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {collaborator.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{collaborator.name}</h3>
                    {collaborator.job_title && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {collaborator.job_title}
                      </p>
                    )}
                  </div>
                </div>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(collaborator)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(collaborator)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{collaborator.email}</span>
                </div>
                {collaborator.whatsapp && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{collaborator.whatsapp}</span>
                  </div>
                )}
                {collaborator.description && (
                  <div className="flex items-start gap-2 text-muted-foreground mt-3 pt-3 border-t border-border">
                    <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{collaborator.description}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border">
                <Badge className={cn("font-medium", statusColors[collaborator.status])}>
                  {collaborator.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
        setIsFormDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Colaborador" : "Novo Colaborador"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Atualize os dados do colaborador"
                : "Preencha os dados do novo colaborador"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Nome completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                placeholder="+55 11 99999-9999"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job_title">Função</Label>
              <Input
                id="job_title"
                placeholder="Ex: Gerente de Vendas"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição das Atividades</Label>
              <Textarea
                id="description"
                placeholder="Descreva as principais atividades e responsabilidades..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFormDialogOpen(false)}
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={formLoading}
              className="bg-gradient-to-r from-purple to-pink"
            >
              {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir colaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{selectedCollaborator?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={formLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={formLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
