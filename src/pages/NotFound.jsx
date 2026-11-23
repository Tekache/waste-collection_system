import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Button, EmptyState } from "../components/ui";

export default function NotFound() {
  return (
    <div className="auth-page">
      <EmptyState icon={SearchX} title="Page not found" message="The page you are looking for does not exist or has moved." action={<Link to="/"><Button>Go to home</Button></Link>} />
    </div>
  );
}
