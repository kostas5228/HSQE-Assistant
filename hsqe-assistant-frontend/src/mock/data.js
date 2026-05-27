// src/mock/data.js

// --------------------
// USERS
// --------------------

// Active session user (what getMe() returns -> matched by email in mockUsers)
export const mockUser = {
  email: "me@company.com",
  full_name: "My Name",
  is_admin: true,
};

// Users directory with permissions (admin edits these from Settings)
export const mockUsers = [
  {
    email: "me@company.com",
    full_name: "My Name",
    is_admin: true,
    permissions: {
      tabs: {
        dashboard: true,
        certificates: true,
        inspections: true,
        tasks: true,
        directory: true,
        settings: true,
      },
      vessels: ["ALL"],
    },
  },
  {
    email: "k.kordopatis@company.com",
    full_name: "k.kordopatis",
    is_admin: false,
    permissions: {
      tabs: {
        dashboard: true,
        certificates: true,
        inspections: true,
        tasks: true,
        directory: true,
        settings: false,
      },
      vessels: ["ALL"],
    },
  },
  {
    email: "ops@company.com",
    full_name: "Ops Team",
    is_admin: false,
    permissions: {
      tabs: {
        dashboard: true,
        certificates: false,
        inspections: true,
        tasks: true,
        directory: false,
        settings: false,
      },
      vessels: ["ALL"],
    },
  },
];

// --------------------
// SETTINGS (editable via Settings.jsx)
// --------------------
export const mockSettings = {
  vessels: ["W-Ace", "W-Arcturus", "W-Emerald", "W-Jade", "W-Lion", "W-Luna", "W-Malvina", "W-Mary", "W-Mayfair", "W-Nautilus", "W-Original", "W-Oslo", "W-Pacific", "W-Pearl", "W-Sapphire", "W-Sky", "W-Smash", "W-Star", "W-Eagle", "W-Galaxy", "W-Raptor"],

  users: mockUsers.map(({ email, full_name }) => ({ email, full_name })),

  certificateTypes: ["Annual Confirmation", "Annual Test", "ASI - Annual Safety Inspection", "Cyber Security Audit", "Initial", "Intermediate", "Internal Audit (ISM-ISPS-MLC combined)", "Navigational Audit", "Other", "Renewal", "Safety", "Class", "Vetting Inspection"],

  departments: ["Accounting", "Administration", "Chartering", "Crew", "HSQE", "IT", "Legal", "Management", "Marine", "Supplies", "Technical"],

  inspectionTypes: ["PSC", "Flag", "Vetting"],

  flagStates: ["Liberia"],

  pscAuthorities: [
    "Abuja MoU",
    "Black Sea MoU",
    "Caribbean MoU",
    "Indian Ocean MoU",
    "Mediterranean MoU",
    "Paris MoU",
    "Riyadh MoU",
    "Tokyo MoU",
    "USCG",
    "Viña del Mar MoU",
  ],

  findingTypes: ["Deficiency", "Observation", "Recommendation", "Finding"],

  pscCodeGroups: {
    "01": "Certificates & Documentation",
    "02": "Structural Conditions",
    "03": "Water / Weathertight Conditions",
    "04": "Emergency Systems",
    "05": "Radio Communications",
    "06": "Cargo Operations incl. Equipment",
    "07": "Fire Safety",
    "08": "Alarms",
    "09": "Working & Living Conditions",
    "10": "Safety of Navigation",
    "11": "Life Saving Appliances",
    "12": "Dangerous Goods",
    "13": "Propulsion & Auxiliary Machinery",
    "14": "Pollution Prevention",
    "15": "ISM",
    "16": "Crew & Accommodation",
    "17": "Operational Requirements",
    "18": "Labour Conditions",
    "19": "Security (ISPS)",
    "99": "Other",
  },

  vettingCodeGroups: {
    "01": "General Information",
    "02": "Certification & Personnel Management",
    "03": "Navigation",
    "04": "ISM System",
    "05": "Pollution Prevention & Control",
    "06": "Ship’s Structure",
    "7A": "Fuel Management (Oil)",
    "8A": "Cargo Operation – Solid Bulk other than grain",
    "8B": "Cargo Operation – Bunk Grain",
    "9A": "Hatch Covers & Lifting Appliances",
    "9B": "Gantry Cranes",
    "10": "Mooring Operations",
    "11": "Radio & Communications",
    "12": "Security",
    "13": "Machinery Space",
    "14": "General Appearance – Hull & Superstructure",
    "15": "Health & Welfare of Seafarers",
    "16": "Ice or Polar Water Operations",
    "17": "Ship-to-Ship Operation",
  },
};

// --------------------
// BACKWARD EXPORTS (your UI uses these)
// --------------------
export const mockVessels = mockSettings.vessels;
export const mockCertificateTypes = mockSettings.certificateTypes;
export const mockDepartments = mockSettings.departments;
export const mockInspectionTypes = mockSettings.inspectionTypes;
export const mockFlagStates = mockSettings.flagStates;
export const mockPscAuthorities = mockSettings.pscAuthorities;
export const mockFindingTypes = mockSettings.findingTypes;

export const mockPscCodeGroups = mockSettings.pscCodeGroups;
export const mockVettingCodeGroups = mockSettings.vettingCodeGroups;

// --------------------
// DIRECTORY
// --------------------
export const mockDirectoryContacts = [
  {
    id: "d1",
    full_name: "bakas e;",
    short_id: "bke",
    department: "Technical",
    business_phone: "21069586859",
    personal_phone: "6954658598",
    extension: "445",
    vessels: ["W-LION", "W-JADE", "W-EMERALD"],
  },
  {
    id: "d2",
    full_name: "kas m",
    short_id: "ksm",
    department: "Technical",
    business_phone: "2105856589",
    personal_phone: "15456985",
    extension: "448",
    vessels: ["W-ARCTURUS", "W-EMERALD", "W-JADE"],
  },
  {
    id: "d3",
    full_name: "kordopatis konstantinos",
    short_id: "kdk",
    department: "HSQE",
    business_phone: "21025258598",
    personal_phone: "6945859565",
    extension: "7774",
    vessels: ["W-JADE", "W-EMERALD"],
  },
];

// --------------------
// CERTIFICATES
// --------------------
export const mockCertificates = [
  {
    id: "c1",
    certificate_name: "Safety Certificate",
    certificate_code: "SC-001",
    vessel: "W-ACE",
    type: "Safety",
    from_date: "2025-01-01",
    to_date: new Date().toISOString().slice(0, 10),
    notes: "",
    status: "Due",
  },
  {
    id: "c2",
    certificate_name: "Class Certificate",
    certificate_code: "CC-010",
    vessel: "W-LUNA",
    type: "Class",
    from_date: "2024-06-01",
    to_date: "2026-06-01",
    notes: "",
    status: "Valid",
  },
];

// --------------------
// TASKS
// --------------------
export const mockTasks = [
  {
    id: "t1",
    title: "Follow up with vessel",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_by: "me@company.com",
    due_date: new Date().toISOString().slice(0, 10),
    status: "Open",
    vessels: ["W-ACE"],
    assigned_to: ["me@company.com"],
    notes: "Note example",
    steps: [],
    attachments: [],
  },
];

// --------------------
// INSPECTIONS (Findings rows)
// --------------------
export const mockInspections = [
  {
    id: "i1",
    date: new Date().toISOString().slice(0, 10),
    vessel: "W-ACE",
    inspection_type: "PSC",
    psc_authority: "Paris MoU",
    code: "058",
    finding_type: "Deficiency",
    description: "Fire extinguisher issue",
  },
];

// --------------------
// INSPECTION REPORTS
// --------------------
export const mockInspectionReports = [
  {
    id: "r1",
    date: "2025-12-22",
    vessel: "W-ARCTURUS",
    inspection_type: "PSC",
    psc_authority: "Paris MoU",
    deficiencies: 2,
    observations: 3,
    other: 1,
    detention: false,
  },
];
