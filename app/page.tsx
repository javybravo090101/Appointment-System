import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PawPrint, Calendar, Shield, Heart, Clock, Star } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <PawPrint className="h-7 w-7 text-pawgreen" />
            <span className="text-xl font-bold tracking-tight">PawCare</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild className="bg-pawgreen hover:bg-pawgreen-dark text-white">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 md:py-32 bg-gradient-to-b from-green-50/60 to-white">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-pawgreen/10 px-4 py-1.5 text-sm font-medium text-pawgreen mb-6">
              <PawPrint className="h-4 w-4" />
              Trusted by pet owners
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
              Caring for your pets,{" "}
              <span className="text-pawgreen">one paw at a time</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              Book veterinary appointments, manage pet profiles, and stay on top
              of your furry friend&apos;s health — all in one place.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="bg-pawgreen hover:bg-pawgreen-dark text-white px-8">
                <Link href="/login">Book an Appointment</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Why choose PawCare?
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  icon: Calendar,
                  title: "Easy Scheduling",
                  desc: "Pick from available slots on our color-coded calendar and book in seconds.",
                },
                {
                  icon: Shield,
                  title: "Trusted Professionals",
                  desc: "Our licensed veterinarians provide top-quality care for every pet.",
                },
                {
                  icon: Heart,
                  title: "Pet Profiles",
                  desc: "Keep detailed records of each pet's breed, weight, and medical notes.",
                },
                {
                  icon: Clock,
                  title: "Appointment Reminders",
                  desc: "Receive email reminders 3 days and 10 hours before your visit.",
                },
                {
                  icon: Star,
                  title: "Complete Services",
                  desc: "From checkups and vaccines to grooming and dental care — we cover it all.",
                },
                {
                  icon: PawPrint,
                  title: "Personalized Dashboard",
                  desc: "Track all your appointments, pets, and notifications in one place.",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border bg-card p-6 text-center shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pawgreen/10">
                    <feature.icon className="h-6 w-6 text-pawgreen" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-pawgreen/5">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to give your pet the best care?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Join PawCare today and experience hassle-free veterinary
              appointments.
            </p>
            <Button size="lg" asChild className="bg-pawgreen hover:bg-pawgreen-dark text-white px-8">
              <Link href="/register">Sign Up Free</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-pawgreen" />
            <span className="font-semibold">PawCare Clinic</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PawCare Clinic. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
