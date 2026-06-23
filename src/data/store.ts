// ── CGP CRM Data Layer ──────────────────────────────────────
// Service & Customer Management — NO sales/deals/pipelines

export type CustomerStatus = 'aktiv' | 'pausiert' | 'neu' | 'archiviert';
export type ServiceStatus = 'geplant' | 'unterwegs' | 'vor-ort' | 'abgeschlossen' | 'abgesagt';
export type TaskPriority = 'niedrig' | 'mittel' | 'hoch' | 'dringend';
export type TaskStatus = 'offen' | 'in-arbeit' | 'erledigt';
export type NoteType = 'notiz' | 'anruf' | 'email' | 'besuch' | 'intern' | 'änderung';

export interface ContactPerson {
  name: string;
  role: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  city: string;
  zip: string;
  lat: number;
  lng: number;
  phone: string;
  email: string;
  contacts: ContactPerson[];
  status: CustomerStatus;
  priority: TaskPriority;
  tags: string[];
  customerSince: string;
  lastService: string;
  nextService: string;
  avatar: string;
  serviceCount: number;
  notes: Note[];
  tasks: Task[];
}

export interface Note {
  id: string;
  customerId: string;
  type: NoteType;
  content: string;
  author: string;
  authorAvatar: string;
  createdAt: string;
  pinned: boolean;
}

export interface Task {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  assigneeAvatar: string;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
}

export interface ServiceEvent {
  id: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  title: string;
  description: string;
  status: ServiceStatus;
  assignee: string;
  assigneeAvatar: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
}

export interface Activity {
  id: string;
  type: NoteType;
  title: string;
  description: string;
  customerName: string;
  customerId: string;
  user: string;
  userAvatar: string;
  timestamp: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  email: string;
  activeTasks: number;
  completedToday: number;
}

// ── Seed Data ───────────────────────────────────────────────

const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e','#ec4899','#3b82f6'];

const teamMembers: TeamMember[] = [
  { id:'u1', name:'Lars Herzer', role:'Administrator', avatar:'#6366f1', email:'lars@cgp.de', activeTasks:4, completedToday:3 },
  { id:'u2', name:'Sarah Weber', role:'Service-Leiterin', avatar:'#8b5cf6', email:'sarah@cgp.de', activeTasks:6, completedToday:5 },
  { id:'u3', name:'Thomas Schmidt', role:'Techniker', avatar:'#06b6d4', email:'thomas@cgp.de', activeTasks:3, completedToday:7 },
  { id:'u4', name:'Nina Müller', role:'Kundenbetreuung', avatar:'#10b981', email:'nina@cgp.de', activeTasks:5, completedToday:4 },
  { id:'u5', name:'Felix Braun', role:'Techniker', avatar:'#f59e0b', email:'felix@cgp.de', activeTasks:2, completedToday:6 },
];

const customerNames = [
  'Bäckerei Sonnenschein','Autohaus Krüger','Praxis Dr. Hartmann','Restaurant Goldener Hirsch',
  'Friseur Elegance','Metzgerei Hoffmann','Steuerberater König & Partner','Blumen Paradies',
  'Fitness Studio PowerZone','Hotel Alpenblick','Zahnarzt Dr. Wolf','Immobilien Richter GmbH',
  'Rechtsanwalt Schneider','Optiker Brillant','Schreinerei Holzmann','Café Zeitgeist',
  'Apotheke am Markt','Architekturbüro Klein','IT-Service NetWork','Physiotherapie Vital',
];

const streets = [
  'Hauptstraße 12','Bahnhofstraße 45','Gartenweg 8','Industriestraße 23',
  'Am Marktplatz 3','Rosenstraße 17','Waldweg 56','Bergstraße 91',
  'Kirchgasse 4','Sonnenallee 33','Lindenweg 22','Eichenstraße 7',
  'Schillerstraße 14','Mozartweg 28','Fichtenring 5','Tulpenweg 19',
  'Dorfstraße 41','Wiesengrund 6','Am Stadtpark 15','Brückenstraße 30',
];

const cities = [
  {city:'München',zip:'80331',lat:48.137,lng:11.576},
  {city:'Berlin',zip:'10115',lat:52.520,lng:13.405},
  {city:'Hamburg',zip:'20095',lat:53.551,lng:9.994},
  {city:'Frankfurt',zip:'60311',lat:50.110,lng:8.682},
  {city:'Stuttgart',zip:'70173',lat:48.775,lng:9.183},
  {city:'Köln',zip:'50667',lat:50.938,lng:6.960},
  {city:'Düsseldorf',zip:'40213',lat:51.227,lng:6.774},
  {city:'Nürnberg',zip:'90403',lat:49.454,lng:11.078},
  {city:'Leipzig',zip:'04109',lat:51.340,lng:12.375},
  {city:'Dresden',zip:'01067',lat:51.051,lng:13.738},
];

const tags = ['Wartungsvertrag','Premium','Standard','Neukunde','Schlüsselkunde','Saisonkunde','Notdienst','Privat','Gewerbe','Industrie'];

const noteContents = [
  'Kunde wünscht Terminverschiebung auf nächste Woche.',
  'Anlage wurde gewartet, Filter getauscht. Alles in Ordnung.',
  'Rückruf vereinbart für Mittwoch 14:00 Uhr.',
  'Kunde möchte Zusatzleistung anfragen — Angebot erstellen.',
  'Vor-Ort-Termin durchgeführt. Gerät läuft wieder einwandfrei.',
  'Rechnung wurde vom Kunden beanstandet — Klärung nötig.',
  'Neuer Ansprechpartner: Fr. Meier übernimmt ab sofort.',
  'Wartungsintervall auf quartalsweise geändert.',
  'Kunde sehr zufrieden mit letztem Einsatz.',
  'Dringende Reparatur notwendig — Termin für morgen eingeplant.',
  'Vertragsverlängerung besprochen. Kunde stimmt zu.',
  'Ersatzteile bestellt, Lieferung in 3 Werktagen.',
  'Kunde erreichbar nur vormittags zwischen 8-12 Uhr.',
  'Schlüssel für Zugang liegt bei Nachbar Nr. 5.',
  'Jährliche Inspektion erfolgreich abgeschlossen.',
];

const taskTitles = [
  'Wartung durchführen','Angebot erstellen','Rückruf tätigen','Rechnung prüfen',
  'Ersatzteile bestellen','Protokoll erstellen','Termin bestätigen','Dokumentation aktualisieren',
  'Kundenfeedback einholen','Gerät inspizieren','Nachkontrolle planen','Material vorbereiten',
  'Fahrzeug beladen','Bericht schreiben','Vertrag erneuern','Schulung vorbereiten',
];

const serviceTypes = [
  'Wartung & Inspektion','Reparatur','Installation','Beratungsgespräch',
  'Nachkontrolle','Notdienst','Jahresinspektion','Gerätetausch',
];

function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random()*arr.length)]; }
function rndDate(from: string, to: string): string {
  const f = new Date(from).getTime(), t = new Date(to).getTime();
  return new Date(f + Math.random()*(t-f)).toISOString().split('T')[0];
}
function rndTime(): string {
  const h = 7 + Math.floor(Math.random()*10);
  const m = Math.random()>0.5?'00':'30';
  return `${String(h).padStart(2,'0')}:${m}`;
}

function buildCustomers(): Customer[] {
  return customerNames.map((name, i) => {
    const c = cities[i % cities.length];
    const street = streets[i % streets.length];
    const contactFirst = ['Peter','Maria','Hans','Claudia','Stefan','Sabine','Michael','Andrea','Jürgen','Katrin'][i%10];
    const contactLast = name.split(' ').pop() || 'Kunde';

    const notes: Note[] = Array.from({length: 3 + Math.floor(Math.random()*5)}, (_, ni) => ({
      id: `n-${i}-${ni}`,
      customerId: `k-${i+1}`,
      type: rnd<NoteType>(['notiz','anruf','email','besuch','intern']),
      content: rnd(noteContents),
      author: rnd(teamMembers).name,
      authorAvatar: rnd(COLORS),
      createdAt: rndDate('2025-06-01','2026-01-18'),
      pinned: ni === 0,
    })).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const tasks: Task[] = Array.from({length: 1 + Math.floor(Math.random()*3)}, (_, ti) => {
      const assignee = rnd(teamMembers);
      return {
        id: `t-${i}-${ti}`,
        customerId: `k-${i+1}`,
        customerName: name,
        title: rnd(taskTitles),
        description: 'Aufgabe termingerecht erledigen.',
        status: rnd<TaskStatus>(['offen','in-arbeit','erledigt']),
        priority: rnd<TaskPriority>(['niedrig','mittel','hoch','dringend']),
        assignee: assignee.name,
        assigneeAvatar: assignee.avatar,
        dueDate: rndDate('2026-01-15','2026-03-30'),
        createdAt: rndDate('2025-11-01','2026-01-15'),
      };
    });

    return {
      id: `k-${i+1}`,
      name,
      address: street,
      city: c.city,
      zip: c.zip,
      lat: c.lat + (Math.random()-0.5)*0.05,
      lng: c.lng + (Math.random()-0.5)*0.05,
      phone: `+49 ${Math.floor(100+Math.random()*900)} ${Math.floor(1000000+Math.random()*9000000)}`,
      email: name.toLowerCase().replace(/[^a-zäöü]/g,'').slice(0,12)+'@email.de',
      contacts: [{
        name: `${contactFirst} ${contactLast}`,
        role: rnd(['Inhaber','Geschäftsführer','Filialleiter','Empfang','Haustechnik']),
        phone: `+49 ${Math.floor(100+Math.random()*900)} ${Math.floor(1000000+Math.random()*9000000)}`,
        email: `${contactFirst.toLowerCase()}@${name.toLowerCase().replace(/[^a-z]/g,'').slice(0,10)}.de`,
        isPrimary: true,
      }],
      status: rnd<CustomerStatus>(['aktiv','aktiv','aktiv','pausiert','neu']),
      priority: rnd<TaskPriority>(['niedrig','mittel','hoch','mittel']),
      tags: Array.from({length:1+Math.floor(Math.random()*2)}, ()=>rnd(tags)).filter((v,j,a)=>a.indexOf(v)===j),
      customerSince: rndDate('2020-01-01','2024-12-01'),
      lastService: rndDate('2025-10-01','2026-01-10'),
      nextService: rndDate('2026-01-20','2026-04-30'),
      avatar: COLORS[i % COLORS.length],
      serviceCount: 5 + Math.floor(Math.random()*40),
      notes,
      tasks,
    };
  });
}

function buildServiceEvents(customers: Customer[]): ServiceEvent[] {
  const events: ServiceEvent[] = [];
  customers.forEach((cust, ci) => {
    const count = 1 + Math.floor(Math.random()*2);
    for (let i=0; i<count; i++) {
      const assignee = rnd(teamMembers);
      const time = rndTime();
      const h = parseInt(time.split(':')[0]);
      events.push({
        id: `se-${ci}-${i}`,
        customerId: cust.id,
        customerName: cust.name,
        customerAddress: `${cust.address}, ${cust.zip} ${cust.city}`,
        title: rnd(serviceTypes),
        description: `${rnd(serviceTypes)} bei ${cust.name}`,
        status: rnd<ServiceStatus>(['geplant','geplant','geplant','unterwegs','vor-ort','abgeschlossen','abgeschlossen']),
        assignee: assignee.name,
        assigneeAvatar: assignee.avatar,
        date: rndDate('2026-01-13','2026-02-28'),
        startTime: time,
        endTime: `${String(h+1).padStart(2,'0')}:${time.split(':')[1]}`,
        notes: '',
      });
    }
  });
  return events.sort((a,b) => {
    const dc = a.date.localeCompare(b.date);
    return dc !== 0 ? dc : a.startTime.localeCompare(b.startTime);
  });
}

function buildActivities(customers: Customer[]): Activity[] {
  const acts: Activity[] = [];
  customers.forEach(c => {
    c.notes.forEach(n => {
      acts.push({
        id: `act-${n.id}`,
        type: n.type,
        title: n.type === 'anruf' ? 'Telefonat' : n.type === 'besuch' ? 'Vor-Ort-Besuch' : n.type === 'email' ? 'E-Mail' : n.type === 'intern' ? 'Interne Notiz' : 'Notiz erstellt',
        description: n.content.slice(0,80),
        customerName: c.name,
        customerId: c.id,
        user: n.author,
        userAvatar: n.authorAvatar,
        timestamp: n.createdAt,
      });
    });
  });
  return acts.sort((a,b) => new Date(b.timestamp).getTime()-new Date(a.timestamp).getTime()).slice(0,30);
}

export const customers = buildCustomers();
export const serviceEvents = buildServiceEvents(customers);
export const activities = buildActivities(customers);
export const team = teamMembers;

export function getInitials(name: string): string {
  return name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
}

// ── Dashboard KPI data ─────────────────────────────────────

const allTasks = customers.flatMap(c => c.tasks);

export const kpi = {
  totalCustomers: customers.length,
  activeCustomers: customers.filter(c=>c.status==='aktiv').length,
  newCustomers: customers.filter(c=>c.status==='neu').length,
  scheduledServices: serviceEvents.filter(s=>s.status==='geplant').length,
  completedServices: serviceEvents.filter(s=>s.status==='abgeschlossen').length,
  totalServices: serviceEvents.length,
  openTasks: allTasks.filter(t=>t.status!=='erledigt').length,
  completedTasks: allTasks.filter(t=>t.status==='erledigt').length,
  totalTasks: allTasks.length,
  urgentTasks: allTasks.filter(t=>t.priority==='dringend'&&t.status!=='erledigt').length,
  monthlyServices: [
    {month:'Aug',value:28},{month:'Sep',value:34},{month:'Okt',value:31},
    {month:'Nov',value:42},{month:'Dez',value:38},{month:'Jan',value:45},
  ],
  servicesByType: [
    {type:'Wartung',count:18},{type:'Reparatur',count:12},{type:'Installation',count:8},
    {type:'Inspektion',count:15},{type:'Notdienst',count:4},
  ],
  weeklyActivity: [
    {day:'Mo',einsätze:6,aufgaben:12,notizen:8},
    {day:'Di',einsätze:8,aufgaben:15,notizen:11},
    {day:'Mi',einsätze:7,aufgaben:10,notizen:14},
    {day:'Do',einsätze:9,aufgaben:13,notizen:9},
    {day:'Fr',einsätze:5,aufgaben:8,notizen:6},
  ],
  customersByStatus: [
    {status:'Aktiv',count:customers.filter(c=>c.status==='aktiv').length,color:'#10b981'},
    {status:'Neu',count:customers.filter(c=>c.status==='neu').length,color:'#06b6d4'},
    {status:'Pausiert',count:customers.filter(c=>c.status==='pausiert').length,color:'#f59e0b'},
    {status:'Archiviert',count:customers.filter(c=>c.status==='archiviert').length,color:'#5a5a75'},
  ],
};
