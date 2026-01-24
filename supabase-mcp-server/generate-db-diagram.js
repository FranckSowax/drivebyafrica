#!/usr/bin/env node

/**
 * Génère un diagramme visuel ASCII de la structure de la base de données
 */

const tables = {
  profiles: {
    description: "Profils utilisateurs",
    records: 0,
    key_fields: ["id", "full_name", "role", "balance", "country"],
    relations: []
  },
  vehicles: {
    description: "Catalogue de véhicules (150,931)",
    records: 150931,
    key_fields: ["id", "make", "model", "year", "current_price_usd", "status"],
    relations: []
  },
  quotes: {
    description: "Devis de transport",
    records: "?",
    key_fields: ["id", "quote_number", "vehicle_id", "user_id", "total_cost_xaf"],
    relations: ["user_id -> profiles.id", "vehicle_id -> vehicles.id"]
  },
  orders: {
    description: "Commandes",
    records: "?",
    key_fields: ["id", "order_number", "user_id", "vehicle_id", "status"],
    relations: ["user_id -> profiles.id", "vehicle_id -> vehicles.id", "quote_id -> quotes.id"]
  },
  order_tracking: {
    description: "Suivi de commande",
    records: "?",
    key_fields: ["id", "order_id", "status", "location"],
    relations: ["order_id -> orders.id"]
  },
  bids: {
    description: "Enchères",
    records: 0,
    key_fields: ["id", "vehicle_id", "user_id", "amount", "status"],
    relations: ["vehicle_id -> vehicles.id", "user_id -> profiles.id"]
  },
  favorites: {
    description: "Véhicules favoris",
    records: "?",
    key_fields: ["id", "vehicle_id", "user_id"],
    relations: ["vehicle_id -> vehicles.id", "user_id -> profiles.id"]
  },
  notifications: {
    description: "Notifications utilisateurs",
    records: 0,
    key_fields: ["id", "user_id", "type", "title", "is_read"],
    relations: ["user_id -> profiles.id"]
  },
  transactions: {
    description: "Transactions financières",
    records: 0,
    key_fields: ["id", "user_id", "order_id", "amount", "type"],
    relations: ["user_id -> profiles.id", "order_id -> orders.id"]
  },
  chat_conversations: {
    description: "Conversations chat",
    records: "non créée",
    key_fields: ["id", "user_id", "admin_id"],
    relations: ["user_id -> profiles.id", "admin_id -> profiles.id"]
  },
  chat_messages: {
    description: "Messages chat",
    records: 0,
    key_fields: ["id", "conversation_id", "sender_id", "content"],
    relations: ["conversation_id -> chat_conversations.id", "sender_id -> profiles.id"]
  }
};

console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║            STRUCTURE DE LA BASE DE DONNÉES - DRIVEBY AFRICA                 ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│                          TABLES PRINCIPALES                                  │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');

// Fonction pour afficher une table
function displayTable(name, info) {
  const width = 77;
  const recordsInfo = typeof info.records === 'number'
    ? `${info.records.toLocaleString()} enregistrements`
    : info.records;

  console.log('┏' + '━'.repeat(width) + '┓');
  console.log(`┃ 📊 ${name.toUpperCase().padEnd(width - 5)} ┃`);
  console.log('┣' + '━'.repeat(width) + '┫');
  console.log(`┃ ${info.description.padEnd(width - 2)} ┃`);
  console.log(`┃ 📈 ${recordsInfo.padEnd(width - 5)} ┃`);
  console.log('┣' + '━'.repeat(width) + '┫');
  console.log(`┃ Champs clés:${' '.repeat(width - 14)} ┃`);
  info.key_fields.forEach(field => {
    console.log(`┃   • ${field.padEnd(width - 7)} ┃`);
  });

  if (info.relations.length > 0) {
    console.log('┣' + '━'.repeat(width) + '┫');
    console.log(`┃ Relations:${' '.repeat(width - 12)} ┃`);
    info.relations.forEach(rel => {
      console.log(`┃   → ${rel.padEnd(width - 7)} ┃`);
    });
  }

  console.log('┗' + '━'.repeat(width) + '┛\n');
}

// Afficher les tables principales
const mainTables = ['profiles', 'vehicles', 'quotes', 'orders'];
mainTables.forEach(tableName => {
  displayTable(tableName, tables[tableName]);
});

console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│                      TABLES COMPLÉMENTAIRES                                  │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');

const secondaryTables = ['bids', 'favorites', 'notifications', 'transactions', 'chat_messages'];
secondaryTables.forEach(tableName => {
  if (tables[tableName]) {
    displayTable(tableName, tables[tableName]);
  }
});

// Diagramme de relations
console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│                     DIAGRAMME DES RELATIONS                                  │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');

console.log(`
                             ┌──────────────┐
                             │   PROFILES   │
                             │  (Utilisateurs) │
                             └───────┬──────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │   QUOTES     │  │     BIDS     │  │  FAVORITES   │
            │   (Devis)    │  │  (Enchères)  │  │  (Favoris)   │
            └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                   │                 │                 │
                   │                 └─────────┐       │
                   ▼                           ▼       ▼
            ┌──────────────────────────────────────────┐
            │            VEHICLES (150,931)             │
            │         (Catalogue de véhicules)          │
            └──────────────────────────────────────────┘
                                     ▲
                    ┌────────────────┼────────────────┐
                    │                │                │
                    │                ▼                │
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │    ORDERS    │  │ ORDER_TRACKING│ │TRANSACTIONS  │
            │  (Commandes) │  │    (Suivi)   │  │(Paiements)   │
            └──────────────┘  └──────────────┘  └──────────────┘
`);

// Statistiques RLS
console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│                      POLITIQUES RLS (ROW LEVEL SECURITY)                     │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');

const rlsStatus = [
  { operation: 'SELECT', status: '✅ ACTIF', note: 'Lecture contrôlée' },
  { operation: 'INSERT', status: '🔒 BLOQUÉ', note: 'Protection active' },
  { operation: 'UPDATE', status: '⚠️  PERMISSIF', note: 'À restreindre' },
  { operation: 'DELETE', status: '⚠️  PERMISSIF', note: 'À restreindre' }
];

console.log('┏━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
console.log('┃ Opération  ┃     Status     ┃                 Notes                     ┃');
console.log('┣━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫');
rlsStatus.forEach(item => {
  console.log(`┃ ${item.operation.padEnd(10)} ┃ ${item.status.padEnd(14)} ┃ ${item.note.padEnd(41)} ┃`);
});
console.log('┗━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n');

// Recommandations
console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│                            RECOMMANDATIONS                                   │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');

const recommendations = [
  { priority: '🔴', title: 'Restreindre les politiques UPDATE/DELETE', status: 'Critique' },
  { priority: '🔴', title: 'Créer les tables manquantes (chat_rooms, etc.)', status: 'Critique' },
  { priority: '🟡', title: 'Configurer les buckets Storage', status: 'Important' },
  { priority: '🟡', title: 'Implémenter les triggers d\'audit', status: 'Important' },
  { priority: '🟢', title: 'Optimiser les index de recherche', status: 'Amélioration' },
  { priority: '🟢', title: 'Créer des vues matérialisées', status: 'Amélioration' }
];

recommendations.forEach((rec, idx) => {
  console.log(`${idx + 1}. ${rec.priority} ${rec.title}`);
  console.log(`   Status: ${rec.status}\n`);
});

console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                              FIN DU RAPPORT                                  ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

console.log('📄 Rapport détaillé disponible dans: SUPABASE_DATABASE_ANALYSIS.md\n');
