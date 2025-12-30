import { Building2, ChevronDown, X, Check } from "lucide-react";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function TenantSelector() {
  const {
    isSuperAdmin,
    availableTenants,
    selectedTenantId,
    selectedTenantName,
    setSelectedTenant,
    isViewingOtherTenant,
    clearTenantSelection,
  } = usePermissions();

  // Only show for Super Admins
  if (!isSuperAdmin) return null;

  return (
    <div className="flex items-center gap-2">
      <AnimatePresence>
        {isViewingOtherTenant && selectedTenantName && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30"
          >
            <Building2 className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-500">
              Visualizando: {selectedTenantName}
            </span>
            <button
              onClick={clearTenantSelection}
              className="ml-1 p-0.5 rounded hover:bg-amber-500/20 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-amber-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2 border-border/50",
              isViewingOtherTenant && "border-amber-500/50 text-amber-500 hover:text-amber-400"
            )}
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isViewingOtherTenant ? "Trocar Conta" : "Selecionar Conta"}
            </span>
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto bg-popover z-50">
          {isViewingOtherTenant && (
            <>
              <DropdownMenuItem
                onClick={clearTenantSelection}
                className="text-amber-500 focus:text-amber-400"
              >
                <X className="w-4 h-4 mr-2" />
                Voltar para minha conta
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {availableTenants.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
              Nenhuma conta disponível
            </div>
          ) : (
            availableTenants.map((tenant) => (
              <DropdownMenuItem
                key={tenant.id}
                onClick={() => setSelectedTenant(tenant.id, tenant.name)}
                className="flex items-center justify-between"
              >
                <span className="truncate">{tenant.name}</span>
                {selectedTenantId === tenant.id && (
                  <Check className="w-4 h-4 text-purple ml-2 shrink-0" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
