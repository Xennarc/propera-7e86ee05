import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ProperaMark } from "@/components/icons/ProperaLogo";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <ProperaMark size={48} className="mx-auto mb-6" />
        <h1 className="mb-2 text-6xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">
          Oops! This page doesn't exist.
        </p>
        <Button asChild>
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Return to Home
          </Link>
        </Button>
      </div>
      <p className="mt-12 text-sm text-muted-foreground">
        © Propera. All rights reserved.
      </p>
    </div>
  );
};

export default NotFound;
