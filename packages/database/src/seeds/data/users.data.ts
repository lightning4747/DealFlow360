import * as bcrypt from 'bcryptjs';

export async function getUsersData() {
  const passwordHash = await bcrypt.hash('password123', 10);

  return [
    // Administrators (2)
    { email: 'admin@dealflow360.com', name: 'System Administrator', role: 'admin' as const, hashedPassword: passwordHash },
    { email: 'admin2@dealflow360.com', name: 'Ops Admin', role: 'admin' as const, hashedPassword: passwordHash },

    // Sales Representatives (10)
    { email: 'rep1@dealflow360.com', name: 'Alice Rep', role: 'sales_rep' as const, hashedPassword: passwordHash },
    { email: 'rep2@dealflow360.com', name: 'Bob Rep', role: 'sales_rep' as const, hashedPassword: passwordHash },
    { email: 'rep3@dealflow360.com', name: 'Charlie Rep', role: 'sales_rep' as const, hashedPassword: passwordHash },
    { email: 'rep4@dealflow360.com', name: 'Diana Rep', role: 'sales_rep' as const, hashedPassword: passwordHash },
    { email: 'rep5@dealflow360.com', name: 'Evan Rep', role: 'sales_rep' as const, hashedPassword: passwordHash },
    { email: 'rep6@dealflow360.com', name: 'Fiona Rep', role: 'sales_rep' as const, hashedPassword: passwordHash },
    { email: 'rep7@dealflow360.com', name: 'George Rep', role: 'sales_rep' as const, hashedPassword: passwordHash },
    { email: 'rep8@dealflow360.com', name: 'Hannah Rep', role: 'sales_rep' as const, hashedPassword: passwordHash },
    { email: 'rep9@dealflow360.com', name: 'Ian Rep', role: 'sales_rep' as const, hashedPassword: passwordHash },
    { email: 'rep10@dealflow360.com', name: 'Julia Rep', role: 'sales_rep' as const, hashedPassword: passwordHash },

    // Sales Managers (5)
    { email: 'manager@dealflow360.com', name: 'Carol Manager', role: 'sales_manager' as const, hashedPassword: passwordHash },
    { email: 'manager2@dealflow360.com', name: 'Kevin Manager', role: 'sales_manager' as const, hashedPassword: passwordHash },
    { email: 'manager3@dealflow360.com', name: 'Laura Manager', role: 'sales_manager' as const, hashedPassword: passwordHash },
    { email: 'manager4@dealflow360.com', name: 'Michael Manager', role: 'sales_manager' as const, hashedPassword: passwordHash },
    { email: 'manager5@dealflow360.com', name: 'Nina Manager', role: 'sales_manager' as const, hashedPassword: passwordHash },

    // Finance & Operations (3)
    { email: 'finance@dealflow360.com', name: 'Dave Finance', role: 'finance' as const, hashedPassword: passwordHash },
    { email: 'finance2@dealflow360.com', name: 'Oscar Finance', role: 'finance' as const, hashedPassword: passwordHash },
    { email: 'finance3@dealflow360.com', name: 'Paula Finance', role: 'finance' as const, hashedPassword: passwordHash },

    // Customer Buyers (15)
    { email: 'procurement@acme.com', name: 'Sarah Connor (Acme Corp)', role: 'customer' as const, hashedPassword: passwordHash },
    { email: 'purchasing@globex.com', name: 'Hank Scorpio (Globex)', role: 'customer' as const, hashedPassword: passwordHash },
    { email: 'billing@initech.com', name: 'Peter Gibbons (Initech)', role: 'customer' as const, hashedPassword: passwordHash },
    { email: 'ops@apexlogistics.com', name: 'Elena Rostova (Apex Logistics)', role: 'customer' as const, hashedPassword: passwordHash },
    { email: 'it-purchasing@nexushealth.org', name: 'Marcus Vance (Nexus Health)', role: 'customer' as const, hashedPassword: passwordHash },
    { email: 'supply@cyberdyne-quantum.io', name: 'Miles Dyson (Cyberdyne)', role: 'customer' as const, hashedPassword: passwordHash },
    { email: 'infrastructure@vanguardfin.com', name: 'Bruce Wayne (Vanguard)', role: 'customer' as const, hashedPassword: passwordHash },
    { email: 'tech@starlightstudios.com', name: 'Tony Stark (Starlight)', role: 'customer' as const, hashedPassword: passwordHash },
    { email: 'hardware-ops@hooli.com', name: 'Gavin Belson (Hooli)', role: 'customer' as const, hashedPassword: passwordHash },
    { email: 'procurement@wayneenterprises.com', name: 'Lucius Fox (Wayne Ent)', role: 'customer' as const, hashedPassword: passwordHash },
    { email: 'supplychain@starkind.com', name: 'Pepper Potts (Stark Ind)', role: 'customer' as const, hashedPassword: passwordHash },
    { email: 'ops@umbrella.corp', name: 'Albert Wesker (Umbrella)', role: 'customer' as const, hashedPassword: passwordHash },
    { email: 'purchasing@aperturescience.com', name: 'Cave Johnson (Aperture)', role: 'customer' as const, hashedPassword: passwordHash },
    { email: 'tech@massdynamic.com', name: 'Nina Sharp (Mass Dynamic)', role: 'customer' as const, hashedPassword: passwordHash },
    { email: 'admin@tyrellcorp.com', name: 'Eldon Tyrell (Tyrell Corp)', role: 'customer' as const, hashedPassword: passwordHash },
  ];
}
