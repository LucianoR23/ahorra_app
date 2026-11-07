import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/status-screen";

export default function NotFound() {
  return (
    <StatusScreen
      icon={<SearchX className="size-6" />}
      title="No encontramos esta página"
      description="El link puede estar mal escrito o la página ya no existe."
    >
      <Button size="lg" className="w-full" render={<Link href="/" />} nativeButton={false}>
        Ir al inicio
      </Button>
    </StatusScreen>
  );
}
