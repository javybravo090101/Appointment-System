"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, Calendar as CalendarIcon, Clock, Dog, BriefcaseMedical, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Service { id: string; name: string; duration_minutes: number; price: number; }
interface Pet { id: string; name: string; species: string; }
interface Slot { id: string; date: string; start_time: string; end_time: string; max_appointments: number; is_blocked: boolean; service_id: string | null; }

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function BookAppointmentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookedCounts, setBookedCounts] = useState<Record<string, number>>({});
  const [slotPets, setSlotPets] = useState<Record<string, string[]>>({});

  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedPet, setSelectedPet] = useState<string>("");
  const [selectedPets, setSelectedPets] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [notes, setNotes] = useState("");

  const [clientId, setClientId] = useState("");

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setClientId(user.id);

      const [svcRes, petRes, slotRes, apptRes] = await Promise.all([
        supabase.from("services").select("*").eq("is_active", true).order("name"),
        supabase.from("pets").select("*").eq("owner_id", user.id).order("name"),
        supabase.from("availability_slots").select("*").gte("date", toLocalDateStr(new Date())).order("date").order("start_time"),
        supabase.from("appointments").select("slot_id, pet_id").in("status", ["pending", "approved"]),
      ]);

      const counts: Record<string, number> = {};
      const slotPets: Record<string, string[]> = {}; // slot_id -> array of pet_ids
      (apptRes.data ?? []).forEach((a: { slot_id: string | null; pet_id: string }) => {
        if (a.slot_id) {
          counts[a.slot_id] = (counts[a.slot_id] || 0) + 1;
          if (!slotPets[a.slot_id]) slotPets[a.slot_id] = [];
          slotPets[a.slot_id].push(a.pet_id);
        }
      });
      setSlotPets(slotPets);

      setServices(svcRes.data ?? []);
      setPets(petRes.data ?? []);
      setSlots(slotRes.data ?? []);
      setBookedCounts(counts);
      setLoading(false);
    }
    fetchData();
  }, []);

  const isSlotFull = (slot: Slot) => (bookedCounts[slot.id] || 0) >= slot.max_appointments;
  const isPetAlreadyBooked = (slot: Slot, petId: string) => slotPets[slot.id]?.includes(petId) ?? false;
  const isAnyPetAlreadyBooked = (slot: Slot) => selectedPets.some(petId => slotPets[slot.id]?.includes(petId) ?? false);

  const fullyBookedServiceIds = useMemo(() => {
    const serviceSlotMap = new Map<string, Slot[]>();
    slots.forEach(s => {
      if (s.service_id) {
        const arr = serviceSlotMap.get(s.service_id) || [];
        arr.push(s);
        serviceSlotMap.set(s.service_id, arr);
      }
    });
    const fullSet = new Set<string>();
    serviceSlotMap.forEach((svcSlots, svcId) => {
      const allFull = svcSlots.every(s => s.is_blocked || isSlotFull(s));
      if (allFull) fullSet.add(svcId);
    });
    return fullSet;
  }, [slots, bookedCounts]);

  const filteredSlots = useMemo(() => {
    if (!selectedService) return slots;
    return slots.filter(s => s.service_id === selectedService || s.service_id === null);
  }, [slots, selectedService]);

  const slotDates = useMemo(() => {
    const available = new Set<string>();
    const blocked = new Set<string>();
    
    filteredSlots.forEach(s => {
      if (s.is_blocked) {
        blocked.add(s.date);
      } else if (!isSlotFull(s)) {
        available.add(s.date);
      }
    });
    
    return { available, blocked };
  }, [filteredSlots, bookedCounts]);

  const dateStr = selectedDate ? toLocalDateStr(selectedDate) : "";
  const daySlots = useMemo(() => filteredSlots.filter((s) => s.date === dateStr && !s.is_blocked), [filteredSlots, dateStr]);
  const availableDaySlots = useMemo(() => daySlots.filter(s => !isSlotFull(s)), [daySlots, bookedCounts]);

  const handleNext = () => setStep((s) => Math.min(s + 1, 5));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const togglePet = (petId: string) => {
    setSelectedPets(prev => 
      prev.includes(petId) 
        ? prev.filter(id => id !== petId)
        : [...prev, petId]
    );
    // Also set selectedPet for backward compatibility
    setSelectedPet(petId);
  };

  const canProceed = () => {
    if (step === 1) return selectedService !== "";
    if (step === 2) return selectedPets.length > 0;
    if (step === 3) return selectedDate !== undefined && availableDaySlots.length > 0;
    if (step === 4) return selectedSlot !== "";
    return true;
  };

  async function handleSubmit() {
    if (!selectedService || selectedPets.length === 0 || !selectedDate || !selectedSlot) return;

    setSubmitting(true);
    const supabase = createClient();
    const slotObj = slots.find((s) => s.id === selectedSlot);

    // Create one appointment per selected pet
    const appointments = selectedPets.map(petId => ({
      client_id: clientId,
      pet_id: petId,
      service_id: selectedService,
      slot_id: selectedSlot,
      appointment_date: dateStr,
      appointment_time: slotObj?.start_time,
      status: "pending",
      notes: notes || null,
    }));

    const { error } = await supabase.from("appointments").insert(appointments);

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
    } else {
      toast.success(`${selectedPets.length} appointment(s) submitted successfully!`);
      router.push("/appointments");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-pawgreen" />
      </div>
    );
  }

  const formatTime = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const steps = [
    { id: 1, title: "Service", icon: BriefcaseMedical },
    { id: 2, title: "Pet", icon: Dog },
    { id: 3, title: "Date", icon: CalendarIcon },
    { id: 4, title: "Time", icon: Clock },
    { id: 5, title: "Notes", icon: CheckCircle2 }
  ];

  return (
    <div className="max-w-[590px] mx-auto space-y-5 pb-6">
      <div className="text-center space-y-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Book Appointment</h1>
        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">Step-by-step scheduling</p>
      </div>

      {/* Progress Bar */}
      <div className="relative px-8">
        <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-muted -translate-y-1/2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-pawgreen transition-all duration-500 ease-in-out"
            style={{ width: `${((step - 1) / 4) * 100}%` }}
          />
        </div>
        <div className="relative flex justify-between">
          {steps.map((s) => {
            const isCompleted = step > s.id;
            const isCurrent = step === s.id;
            return (
              <div key={s.id} className="flex flex-col items-center gap-1 bg-slate-50 px-1">
                <div 
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isCompleted ? "bg-pawgreen border-pawgreen text-white" : 
                    isCurrent ? "bg-white border-pawgreen text-pawgreen shadow-md scale-110" : 
                    "bg-white border-muted text-muted-foreground"
                  )}
                >
                  <s.icon className={cn("h-3.5 w-3.5", isCurrent && "animate-pulse")} />
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-tighter hidden sm:block",
                  isCurrent ? "text-pawgreen" : "text-muted-foreground"
                )}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 md:p-6 min-h-[320px] flex flex-col">
        
        {/* STEP 1: SERVICE */}
        {step === 1 && (
          <div className="flex-1 animate-in fade-in slide-in-from-right-2 duration-300">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-foreground">
              <BriefcaseMedical className="text-pawgreen h-4 w-4" /> What service do you need?
            </h2>
            {services.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No services available at the moment.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {services.map((svc) => (
                  <Card 
                    key={svc.id} 
                    className={cn(
                      "transition-all border relative",
                      fullyBookedServiceIds.has(svc.id)
                        ? "cursor-not-allowed opacity-60 border-slate-200 bg-slate-50"
                        : selectedService === svc.id
                          ? "cursor-pointer border-pawgreen bg-pawgreen/5 shadow-sm scale-[1.01]"
                          : "cursor-pointer border-slate-100 bg-slate-50/50 hover:border-pawgreen/50"
                    )}
                    onClick={() => {
                      if (fullyBookedServiceIds.has(svc.id)) return;
                      setSelectedService(svc.id);
                      setSelectedDate(undefined);
                      setSelectedSlot("");
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-sm text-foreground">{svc.name}</h3>
                        <span className="font-bold text-pawgreen text-xs">P{svc.price}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[10px] text-muted-foreground font-medium">{svc.duration_minutes} mins duration</p>
                        {fullyBookedServiceIds.has(svc.id) && (
                          <span className="text-[8px] font-bold uppercase tracking-wider text-white bg-pawgreen px-1.5 py-0.5 rounded-full">
                            Fully Booked
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: PET */}
        {step === 2 && (
          <div className="flex-1 animate-in fade-in slide-in-from-right-2 duration-300">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-foreground">
              <Dog className="text-pawgreen h-4 w-4" /> Select Pet(s)
            </h2>
            <p className="text-[10px] text-muted-foreground mb-3">You can select multiple pets for the same appointment.</p>
            {pets.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <p className="text-muted-foreground text-xs mb-3">You haven't added any pets yet.</p>
                <Button onClick={() => router.push("/pets/add")} variant="outline" size="sm" className="h-8">Add a Pet</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pets.map((pet) => (
                  <Card 
                    key={pet.id} 
                    className={cn(
                      "cursor-pointer transition-all border hover:border-pawgreen/50",
                      selectedPets.includes(pet.id) ? "border-pawgreen bg-pawgreen/5 shadow-sm scale-[1.01]" : "border-slate-100 bg-slate-50/50"
                    )}
                    onClick={() => togglePet(pet.id)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                        selectedPets.includes(pet.id) ? "bg-pawgreen border-pawgreen" : "border-slate-300 bg-white"
                      )}>
                        {selectedPets.includes(pet.id) && (
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="h-9 w-9 rounded-full bg-pawgreen/10 flex items-center justify-center border border-pawgreen/20">
                        <Dog className="h-4 w-4 text-pawgreen" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{pet.name}</h3>
                        <p className="text-[10px] text-muted-foreground capitalize font-medium">{pet.species}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {selectedPets.length > 0 && (
              <p className="mt-3 text-xs text-pawgreen font-semibold bg-pawgreen/5 px-3 py-1.5 rounded-full inline-block border border-pawgreen/10">
                {selectedPets.length} pet(s) selected
              </p>
            )}
          </div>
        )}

        {/* STEP 3: DATE */}
        {step === 3 && (
          <div className="flex-1 animate-in fade-in slide-in-from-right-2 duration-300">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-foreground">
              <CalendarIcon className="text-pawgreen h-4 w-4" /> Select a Date
            </h2>
            <div className="flex flex-col items-center justify-center bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-5">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 w-full flex justify-center overflow-hidden">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedSlot("");
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                  className="scale-[1.3] my-8"
                  modifiers={{
                    available: (date) => slotDates.available.has(toLocalDateStr(date)),
                    blocked: (date) => slotDates.blocked.has(toLocalDateStr(date)) && !slotDates.available.has(toLocalDateStr(date)),
                  }}
                  modifiersClassNames={{
                    available: "bg-pawgreen text-white font-bold rounded-full hover:bg-pawgreen hover:text-white shadow-md ring-1 ring-pawgreen/50 ring-offset-1",
                    blocked: "bg-danger text-white font-bold rounded-full hover:bg-danger hover:text-white shadow-md ring-1 ring-danger/50 ring-offset-1",
                  }}
                />
              </div>
              
              <div className="w-full bg-white p-3 rounded-md border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <div className="h-1 w-3 bg-slate-200 rounded-full" /> Calendar Guide
                  </div>
                  <p className="text-[9px] text-muted-foreground italic">Solid colors indicate available dates</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-pawgreen shadow-sm ring-1 ring-pawgreen ring-offset-1" />
                    <span className="text-[10px] text-foreground font-bold">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-danger shadow-sm ring-1 ring-danger ring-offset-1" />
                    <span className="text-[10px] text-foreground font-bold">Blocked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-slate-100 border border-slate-200" />
                    <span className="text-[10px] text-muted-foreground font-medium">No Slots</span>
                  </div>
                </div>
              </div>

              {selectedDate && daySlots.length === 0 && (
                <p className="mt-3 text-danger text-[10px] font-bold bg-danger/5 px-3 py-1.5 rounded-full border border-danger/10">
                  No available time slots for the selected date.
                </p>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: TIME */}
        {step === 4 && (
          <div className="flex-1 animate-in fade-in slide-in-from-right-2 duration-300">
            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2 text-foreground">
              <Clock className="text-pawgreen h-4 w-4" /> Pick a Time Slot
            </h2>
            <p className="text-[10px] text-muted-foreground mb-4 font-bold uppercase tracking-wide bg-slate-50 inline-block px-2 py-0.5 rounded">
              {selectedDate?.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {daySlots.map((slot) => {
                const full = isSlotFull(slot);
                const anyPetBooked = isAnyPetAlreadyBooked(slot);
                const booked = bookedCounts[slot.id] || 0;
                const disabled = full || anyPetBooked;
                return (
                  <Card 
                    key={slot.id} 
                    className={cn(
                      "transition-all border-2 text-center",
                      disabled
                        ? "border-amber-200 bg-amber-50/50 text-muted-foreground cursor-not-allowed opacity-70"
                        : selectedSlot === slot.id
                          ? "border-pawgreen bg-pawgreen text-white shadow-md scale-[1.02] cursor-pointer"
                          : "border-slate-100 bg-slate-50/50 text-foreground cursor-pointer hover:border-pawgreen/50"
                    )}
                    onClick={() => { if (!disabled) setSelectedSlot(slot.id); }}
                  >
                    <CardContent className="p-3">
                      <p className="text-lg font-black tracking-tight">{formatTime(slot.start_time)}</p>
                      <p className={cn("text-[10px] mt-0.5 font-medium uppercase", selectedSlot === slot.id && !disabled ? "text-white/80" : "text-muted-foreground")}>
                        to {formatTime(slot.end_time)}
                      </p>
                      {anyPetBooked ? (
                        <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                          Pet Already Booked
                        </span>
                      ) : full ? (
                        <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                          Fully Booked
                        </span>
                      ) : (
                        <span className="inline-block mt-1.5 text-[9px] font-medium text-muted-foreground">
                          {booked}/{slot.max_appointments} booked
                        </span>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5: NOTES & CONFIRM */}
        {step === 5 && (
          <div className="flex-1 animate-in fade-in slide-in-from-right-2 duration-300">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-foreground">
              <CheckCircle2 className="text-pawgreen h-4 w-4" /> Review & Confirm
            </h2>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2.5 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <h3 className="font-bold text-[10px] border-b border-slate-200 pb-1 text-muted-foreground uppercase tracking-widest">Booking Summary</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                  <span className="text-muted-foreground font-medium">Service Requested:</span>
                  <span className="font-bold text-right text-foreground truncate">{services.find(s => s.id === selectedService)?.name}</span>
                  
                  <span className="text-muted-foreground font-medium">Patient(s):</span>
                  <span className="font-bold text-right text-foreground truncate">
                    {selectedPets.map(petId => pets.find(p => p.id === petId)?.name).join(', ')}
                  </span>
                  
                  <span className="text-muted-foreground font-medium">Appointment Date:</span>
                  <span className="font-bold text-right text-foreground">{selectedDate?.toLocaleDateString(undefined, { dateStyle: 'full' })}</span>
                  
                  <span className="text-muted-foreground font-medium">Arrival Time:</span>
                  <span className="font-bold text-right text-pawgreen text-base">{formatTime(slots.find(s => s.id === selectedSlot)?.start_time || "")}</span>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Additional Notes (Optional)</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Any symptoms, allergies, or special requests for the vet?" 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[90px] text-xs resize-none bg-white border-slate-200 p-3 shadow-inner focus:ring-pawgreen"
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            disabled={step === 1 || submitting}
            className="h-9 px-4 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>

          {step < 5 ? (
            <Button 
              onClick={handleNext} 
              disabled={!canProceed()}
              className="h-9 px-6 gap-1.5 bg-pawgreen hover:bg-pawgreen-dark text-white font-bold text-xs transition-all shadow-sm active:scale-95"
            >
              Next Step <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="h-10 px-8 gap-2 bg-pawgreen hover:bg-pawgreen-dark text-white font-black text-xs shadow-md active:scale-95 transition-all ring-2 ring-pawgreen ring-offset-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              CONFIRM BOOKING
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
