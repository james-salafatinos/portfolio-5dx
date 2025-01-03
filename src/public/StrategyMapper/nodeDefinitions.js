// Node definitions for the business context
class CorporateObjectiveNode {
  constructor() {
    this.addInput("LinkedPrograms", "array");
    this.addOutput("ProgramObjectives", "array");

    this.properties = {
      Name: "",
      Description: "",
      StrategicPriority: "",
    };

    this.addWidget("text", "Name", this.properties.Name, (value) => {
      this.properties.Name = value;
    });

    this.addWidget(
      "text",
      "Description",
      this.properties.Description,
      (value) => {
        this.properties.Description = value;
      }
    );

    this.addWidget(
      "combo",
      "StrategicPriority",
      this.properties.StrategicPriority,
      (value) => {
        this.properties.StrategicPriority = value;
      },
      { values: ["High", "Medium", "Low"] }
    );
  }

  static get title() {
    return "Corporate Objective";
  }
}

class ProgramObjectiveNode {
  constructor() {
    this.addInput("CorporateObjective", "object");
    this.addOutput("Metrics", "array");

    this.properties = {
      Name: "",
      Description: "",
    };

    this.addWidget("text", "Name", this.properties.Name, (value) => {
      this.properties.Name = value;
    });

    this.addWidget(
      "text",
      "Description",
      this.properties.Description,
      (value) => {
        this.properties.Description = value;
      }
    );
  }

  static get title() {
    return "Program Objective";
  }
}

class NorthStarMetricNode {
  constructor() {
    this.addInput("ProgramObjective", "object");
    this.addOutput("Dependencies", "array");

    this.properties = {
      Name: "",
      Description: "",
      CurrentValue: 0,
      TargetValue: 0,
      Threshold: 0,
    };

    this.addWidget("text", "Name", this.properties.Name, (value) => {
      this.properties.Name = value;
    });

    this.addWidget(
      "text",
      "Description",
      this.properties.Description,
      (value) => {
        this.properties.Description = value;
      }
    );

    this.addWidget(
      "number",
      "CurrentValue",
      this.properties.CurrentValue,
      (value) => {
        this.properties.CurrentValue = value;
      }
    );

    this.addWidget(
      "number",
      "TargetValue",
      this.properties.TargetValue,
      (value) => {
        this.properties.TargetValue = value;
      }
    );

    this.addWidget(
      "number",
      "Threshold",
      this.properties.Threshold,
      (value) => {
        this.properties.Threshold = value;
      }
    );
  }

  static get title() {
    return "North Star Metric";
  }
}

class InvestmentRoadmapNode {
  constructor() {
    this.addInput("Initiatives", "array");
    this.addOutput("Milestones", "array");

    this.properties = {
      Name: "",
      TotalBudget: 0,
      Timeline: "",
    };

    this.addWidget("text", "Name", this.properties.Name, (value) => {
      this.properties.Name = value;
    });

    this.addWidget(
      "number",
      "TotalBudget",
      this.properties.TotalBudget,
      (value) => {
        this.properties.TotalBudget = value;
      }
    );

    this.addWidget("text", "Timeline", this.properties.Timeline, (value) => {
      this.properties.Timeline = value;
    });
  }

  static get title() {
    return "Investment Roadmap";
  }
}

class BusinessProcessNode {
  constructor() {
    this.addInput("SupportingCapabilities", "array");
    this.addInput("SupportingApplications", "array");
    this.addOutput("L2Processes", "button");

    this.properties = {
      Name: "",
      Description: "",
      MaturityLevel: "limited",
    };

    this.addWidget("text", "Name", this.properties.Name, (value) => {
      this.properties.Name = value;
    });

    this.addWidget(
      "text",
      "Description",
      this.properties.Description,
      (value) => {
        this.properties.Description = value;
      }
    );

    this.addWidget(
      "combo",
      "MaturityLevel",
      this.properties.MaturityLevel,
      (value) => {
        this.properties.MaturityLevel = value;
      },
      { values: ["limited", "repeatable", "optimized"] }
    );
  }

  static get title() {
    return "Business Process";
  }
}

class CapabilityNode {
  constructor() {
    this.addInput("ProcessesSupported", "array");
    this.addInput("ApplicationsSupported", "array");

    this.properties = {
      Name: "",
      Description: "",
      MaturityLevel: "limited",
    };

    this.addWidget("text", "Name", this.properties.Name, (value) => {
      this.properties.Name = value;
    });

    this.addWidget(
      "text",
      "Description",
      this.properties.Description,
      (value) => {
        this.properties.Description = value;
      }
    );

    this.addWidget(
      "combo",
      "MaturityLevel",
      this.properties.MaturityLevel,
      (value) => {
        this.properties.MaturityLevel = value;
      },
      { values: ["limited", "repeatable", "optimized"] }
    );
  }

  static get title() {
    return "Capability";
  }
}

class ApplicationNode {
  constructor() {
    this.addOutput("ProcessesSupported", "array");
    this.addOutput("CapabilitiesSupported", "array");

    this.properties = {
      Name: "",
      Description: "",
      Vendor: "",
      Version: "",
      Status: "active",
    };

    this.addWidget("text", "Name", this.properties.Name, (value) => {
      this.properties.Name = value;
    });

    this.addWidget(
      "text",
      "Description",
      this.properties.Description,
      (value) => {
        this.properties.Description = value;
      }
    );

    this.addWidget("text", "Vendor", this.properties.Vendor, (value) => {
      this.properties.Vendor = value;
    });

    this.addWidget("text", "Version", this.properties.Version, (value) => {
      this.properties.Version = value;
    });

    this.addWidget(
      "combo",
      "Status",
      this.properties.Status,
      (value) => {
        this.properties.Status = value;
      },
      { values: ["in-development", "active", "retired"] }
    );
  }

  static get title() {
    return "Application";
  }
}

class TransformationInitiativeNode {
  constructor() {
    this.addInput("ScopeItems", "array");

    this.properties = {
      Name: "",
      Description: "",
    };

    this.addWidget("text", "Name", this.properties.Name, (value) => {
      this.properties.Name = value;
    });

    this.addWidget(
      "text",
      "Description",
      this.properties.Description,
      (value) => {
        this.properties.Description = value;
      }
    );
  }

  static get title() {
    return "Transformation Initiative";
  }
}

class ScopeItemNode {
  constructor() {
    this.addInput("Metrics", "array");

    this.properties = {
      Name: "",
      Description: "",
      Complexity: "low",
      Effort: "low",
      Value: 0,
      Cost: 0,
    };

    this.addWidget("text", "Name", this.properties.Name, (value) => {
      this.properties.Name = value;
    });

    this.addWidget(
      "text",
      "Description",
      this.properties.Description,
      (value) => {
        this.properties.Description = value;
      }
    );

    this.addWidget(
      "combo",
      "Complexity",
      this.properties.Complexity,
      (value) => {
        this.properties.Complexity = value;
      },
      { values: ["low", "medium", "high"] }
    );

    this.addWidget(
      "combo",
      "Effort",
      this.properties.Effort,
      (value) => {
        this.properties.Effort = value;
      },
      {
        values: [
          "low (<100 hours)",
          "medium (100-1000 hours)",
          "high (1000-5000 hours)",
          "big rock (5000+ hours)",
        ],
      }
    );

    this.addWidget("number", "Value", this.properties.Value, (value) => {
      this.properties.Value = value;
    });

    this.addWidget("number", "Cost", this.properties.Cost, (value) => {
      this.properties.Cost = value;
    });
  }

  static get title() {
    return "Scope Item";
  }
}

class MetricNode {
  constructor() {
    this.addInput("ScopeItem", "object");

    this.properties = {
      Name: "",
      Description: "",
      CurrentValue: 0,
      TargetValue: 0,
    };

    this.addWidget("text", "Name", this.properties.Name, (value) => {
      this.properties.Name = value;
    });

    this.addWidget(
      "text",
      "Description",
      this.properties.Description,
      (value) => {
        this.properties.Description = value;
      }
    );

    this.addWidget(
      "number",
      "CurrentValue",
      this.properties.CurrentValue,
      (value) => {
        this.properties.CurrentValue = value;
      }
    );

    this.addWidget(
      "number",
      "TargetValue",
      this.properties.TargetValue,
      (value) => {
        this.properties.TargetValue = value;
      }
    );

    this.addWidget("button", "Formula", null, () => {
      alert("Define your formula logic here.");
    });
  }

  static get title() {
    return "Metric";
  }
}

class PersonNode {
  constructor() {
    this.addInput("Team", "object");

    this.properties = {
      Name: "",
      Role: "process owner",
    };

    this.addWidget("text", "Name", this.properties.Name, (value) => {
      this.properties.Name = value;
    });

    this.addWidget(
      "combo",
      "Role",
      this.properties.Role,
      (value) => {
        this.properties.Role = value;
      },
      { values: ["process owner", "architect", "scrum master", "team member"] }
    );
  }

  static get title() {
    return "Person";
  }
}

class TeamNode {
  constructor() {
    this.addInput("Members", "array");

    this.properties = {
      Name: "",
      Size: 0,
      KeyMembers: [],
    };

    this.addWidget("text", "Name", this.properties.Name, (value) => {
      this.properties.Name = value;
    });

    this.addWidget("number", "Size", this.properties.Size, (value) => {
      this.properties.Size = value;
    });

    this.addWidget(
      "multiselect",
      "KeyMembers",
      this.properties.KeyMembers,
      (value) => {
        this.properties.KeyMembers = value;
      }
    );
  }

  static get title() {
    return "Team";
  }
}

export function registerCustomNodes() {
  LiteGraph.registerNodeType(
    "business/CorporateObjective",
    CorporateObjectiveNode
  );
  LiteGraph.registerNodeType("business/ProgramObjective", ProgramObjectiveNode);
  LiteGraph.registerNodeType("business/NorthStarMetric", NorthStarMetricNode);
  LiteGraph.registerNodeType(
    "business/InvestmentRoadmap",
    InvestmentRoadmapNode
  );
  LiteGraph.registerNodeType("business/BusinessProcess", BusinessProcessNode);
  LiteGraph.registerNodeType("business/Capability", CapabilityNode);
  LiteGraph.registerNodeType("business/Application", ApplicationNode);
  LiteGraph.registerNodeType(
    "business/TransformationInitiative",
    TransformationInitiativeNode
  );
  LiteGraph.registerNodeType("business/ScopeItem", ScopeItemNode);
  LiteGraph.registerNodeType("business/Metric", MetricNode);
  LiteGraph.registerNodeType("business/Person", PersonNode);
  LiteGraph.registerNodeType("business/Team", TeamNode);
}
