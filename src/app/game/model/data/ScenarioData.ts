import { Editional } from "../Editional";
import { Spoilable } from "../Spoilable";
import { ObjectiveData } from "./ObjectiveData";

export class ScenarioData implements Editional, Spoilable {

  name: string;
  index: string;
  unlocks: string[];
  blocks: string[];
  requires: string[];
  links: string[];
  group: string | undefined;
  monsters: string[];
  objectives: ObjectiveData[];
  initial: boolean = false;

  // from Editional
  edition: string;

  // from Spoilable
  spoiler: boolean;

  constructor(name: string, index: string, unlocks: string[], blocks: string[], requires: string[], links: string[], monsters: string[], objectives: ObjectiveData[], edition: string, group: string | undefined = undefined,
    spoiler: boolean = false) {
    this.name = name;
    this.index = index;
    this.unlocks = unlocks;
    this.blocks = blocks;
    this.requires = requires;
    this.links = links;
    this.monsters = monsters;
    this.edition = edition;
    this.objectives = objectives;
    this.group = group;
    this.spoiler = spoiler;
  }

}