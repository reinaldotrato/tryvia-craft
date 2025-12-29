import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple/20 rounded-full blur-[128px]"
        animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="relative z-10 text-center px-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-[120px] font-bold gradient-text leading-none">404</h1>
        <h2 className="text-2xl font-bold text-foreground mb-4">Página não encontrada</h2>
        <p className="text-muted-foreground mb-8">A página que você procura não existe.</p>
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button asChild>
            <Link to="/dashboard">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
