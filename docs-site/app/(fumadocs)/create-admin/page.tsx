import { redirect } from "next/navigation";
import { CreateAdminForm } from "./CreateAdminForm";

export default function CreateAdminPage() {
	if (process.env.NODE_ENV !== "development") {
		redirect("/admin");
	}
	return (
		<div className="flex min-h-screen flex-col items-center justify-center p-4">
			<CreateAdminForm />
		</div>
	);
}
