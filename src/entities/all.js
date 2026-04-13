class Project {
  static list() { return []; }
}

class Excavation {
  static list() { return []; }
}

class User {
  static me() { return null; }
  static list() { return []; }
}

class PriceItem {
  static list() { return []; }
}

class MontageLeistung {
  static list() { return []; }
  static create(data) { return data; }
}

class MontageAuftrag {
  static list() { return []; }
}

class Ticket {
  constructor(id, title, description) {
    this.id = id;
    this.title = title;
    this.description = description;
  }
}

export { Project, Excavation, User, PriceItem, MontageLeistung, MontageAuftrag, Ticket };
