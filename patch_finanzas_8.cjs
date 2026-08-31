const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');

f = f.replace(/esPositivo: esDeposito \/\/ Green for deposits\s*\}\);\s*\}\);\s*\}\);\s*\}\);\s*\/\/\s*Orden cron/g, 'esPositivo: esDeposito // Green for deposits\n      });\n    });\n\n    // Orden cron');
f = f.replace(/esPositivo: esDeposito \/\/ Green for deposits\s*\}\);\s*\}\);\s*\}\);\s*\/\/\s*Orden cron/g, 'esPositivo: esDeposito // Green for deposits\n      });\n    });\n\n    // Orden cron');
f = f.replace(/esPositivo: esDeposito \/\/ Green for deposits\s*\}\);\s*\}\);\s*\/\/\s*Orden cron/g, 'esPositivo: esDeposito // Green for deposits\n      });\n    });\n\n    // Orden cron');
f = f.replace(/esPositivo: esDeposito \/\/ Green for deposits\s*\}\);\s*\/\/\s*Orden cron/g, 'esPositivo: esDeposito // Green for deposits\n      });\n    });\n\n    // Orden cron');

fs.writeFileSync('src/pages/Finanzas.jsx', f);
