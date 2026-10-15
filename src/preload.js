const cardUrl = new URL("./nc-temperature-card.bundle.js", import.meta.url);
cardUrl.searchParams.set("reload", Date.now());
await import(cardUrl.href);
