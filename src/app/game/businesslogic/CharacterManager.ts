import { Character } from "../model/Character";
import { CharacterStat } from "../model/CharacterStat";
import { ConditionType, EntityCondition, EntityConditionState } from "../model/Condition";
import { CharacterData } from "../model/data/CharacterData";
import { ObjectiveData } from "../model/data/ObjectiveData";
import { SectionData } from "../model/data/SectionData";
import { SummonData } from "../model/data/SummonData";
import { EntityValueFunction } from "../model/Entity";
import { Figure } from "../model/Figure";
import { FigureError } from "../model/FigureError";
import { Game } from "../model/Game";
import { Monster } from "../model/Monster";
import { MonsterEntity } from "../model/MonsterEntity";
import { Objective } from "../model/Objective";
import { Summon, SummonColor, SummonState } from "../model/Summon";
import { gameManager } from "./GameManager";
import { settingsManager } from "./SettingsManager";

export class CharacterManager {

  game: Game;
  xpMap: number[] = [ 0, 45, 95, 150, 210, 275, 345, 420, 500 ];

  constructor(game: Game) {
    this.game = game;
  }

  characterIcon(characterData: CharacterData) {
    if (characterData.icon) {
      return characterData.icon;
    }
    return './assets/images/character/icons/' + characterData.edition + '-' + characterData.name + '.svg';
  }

  characterThumbnail(characterData: CharacterData) {
    if (characterData.thumbnail) {
      return characterData.thumbnail;
    }
    return './assets/images/character/thumbnail/' + characterData.edition + '-' + characterData.name + '.png';
  }

  addCharacter(characterData: CharacterData) {
    if (!this.game.figures.some((figure: Figure) => {
      return figure instanceof CharacterData && figure.name == characterData.name && figure.edition == characterData.edition;
    })) {
      let character: Character = new Character(characterData, this.game.level);
      character.availableSummons.filter((summonData: SummonData) => summonData.special).forEach((summonData: SummonData) => this.createSpecialSummon(character, summonData));
      this.game.figures.push(character);
      gameManager.sortFigures();
    }
    if (settingsManager.settings.levelCalculation) {
      gameManager.calculateScenarioLevel();
    }
  }

  removeCharacter(character: Character) {
    this.game.figures.splice(this.game.figures.indexOf(character), 1);

    if (character.marker) {
      // remove marker
      const marker = character.edition + '-' + character.name;
      this.game.figures.forEach((figure: Figure) => {
        if (figure instanceof Character) {
          figure.markers.splice(figure.markers.indexOf(marker), 1);
          if (figure.summons) {
            figure.summons.forEach((summon: Summon) => {
              summon.markers.splice(summon.markers.indexOf(marker), 1);
            })
          }
        } else if (figure instanceof Objective) {
          figure.markers.splice(figure.markers.indexOf(marker), 1);
        } else if (figure instanceof Monster) {
          figure.entities.forEach((entity: MonsterEntity) => {
            entity.markers.splice(entity.markers.indexOf(marker), 1);
          })
        }
      })
    }
    if (settingsManager.settings.levelCalculation) {
      gameManager.calculateScenarioLevel();
    }
  }

  addSummon(character: Character, summon: Summon) {
    character.summons = character.summons.filter((value: Summon) => value.name != summon.name || value.number != summon.number || value.color != summon.color);
    character.summons.push(summon);
  }

  removeSummon(character: Character, summon: Summon) {
    character.summons.splice(character.summons.indexOf(summon), 1);
  }


  addObjective(objectiveData: ObjectiveData | undefined = undefined) {
    let id = 0;
    while (this.game.figures.some((figure: Figure) => figure instanceof Objective && figure.id == id)) {
      id++;
    }

    let objective = new Objective(id);

    if (objectiveData) {
      objective.name = objectiveData.name;
      objective.maxHealth = objectiveData.health;
      objective.health = EntityValueFunction("" + objectiveData.health);
      objective.escort = objectiveData.escort;
      if (objectiveData.initiative) {
        objective.initiative = objectiveData.initiative;
      }
    }

    this.game.figures.push(objective);
    gameManager.sortFigures();
  }

  removeObjective(objective: Objective) {
    if (this.game.sections.some((sectionData: SectionData) => sectionData.objectives && sectionData.objectives.length > 0)) {
      this.game.sections = [];
    }
    this.game.figures.splice(this.game.figures.indexOf(objective), 1);
  }

  next() {
    this.game.figures.forEach((figure: Figure) => {
      if (figure instanceof Character) {
        figure.initiative = 0;
        figure.initiativeVisible = false;
        figure.off = false;

        figure.summons = figure.summons.filter((summon: Summon) => !summon.dead && summon.health > 0);

        if (settingsManager.settings.expireConditions) {
          figure.entityConditions = figure.entityConditions.filter((entityCondition: EntityCondition) => !entityCondition.expired);

          figure.summons.forEach((summon: Summon) => {
            summon.entityConditions = summon.entityConditions.filter((entityCondition: EntityCondition) => !entityCondition.expired);
          });
        }

        if (settingsManager.settings.applyConditions) {
          figure.entityConditions.filter((entityCondition: EntityCondition) => entityCondition.types.indexOf(ConditionType.turn) != -1).forEach((entityCondition: EntityCondition) => entityCondition.state = EntityConditionState.normal);

          figure.summons.forEach((summon: Summon) => {
            summon.entityConditions.filter((entityCondition: EntityCondition) => entityCondition.types.indexOf(ConditionType.turn) != -1).forEach((entityCondition: EntityCondition) => entityCondition.state = EntityConditionState.normal);
          });
        }
      } else if (figure instanceof Objective) {
        figure.off = false;

        if (settingsManager.settings.expireConditions) {
          figure.entityConditions = figure.entityConditions.filter((entityCondition: EntityCondition) => !entityCondition.expired);
        }


        if (settingsManager.settings.applyConditions) {
          figure.entityConditions.filter((entityCondition: EntityCondition) => entityCondition.types.indexOf(ConditionType.turn) != -1).forEach((entityCondition: EntityCondition) => entityCondition.state = EntityConditionState.normal);
        }
      }
    })
  }

  addXP(character: Character, value: number) {
    character.progress.experience += value;
    this.xpMap.forEach((value: number, index: number) => {
      if (character.progress.experience >= value && (index < this.xpMap.length - 1 && character.progress.experience < this.xpMap[ index + 1 ] || index == this.xpMap.length - 1)) {
        this.setLevel(character, index + 1);
      }
    })
  }

  setLevel(character: Character, level: number) {
    const stat = character.stats.find((characterStat: CharacterStat) => characterStat.level == level)
    if (!stat) {
      console.error("No character stat found for level: " + level);
      if (character.errors.indexOf(FigureError.stat) == -1) {
        character.errors.push(FigureError.stat);
      }
      character.stat = new CharacterStat(level, 0);
    } else {
      character.stat = stat;
    }

    character.level = level;

    if (character.health == character.maxHealth) {
      character.health = character.stat.health;
    }

    character.maxHealth = character.stat.health;
    if (character.health > character.maxHealth) {
      character.health = character.maxHealth;
    }

    character.availableSummons.filter((summonData: SummonData) => summonData.special).forEach((summonData: SummonData) => this.createSpecialSummon(character, summonData));

    if (character.progress.experience < gameManager.characterManager.xpMap[ level - 1 ] || character.progress.experience >= gameManager.characterManager.xpMap[ level ]) {
      character.progress.experience = gameManager.characterManager.xpMap[ level - 1 ];
    }

    if (settingsManager.settings.levelCalculation) {
      gameManager.calculateScenarioLevel();
    }
  }

  createSpecialSummon(character: Character, summonData: SummonData) {
    character.summons = character.summons.filter((summon: Summon) => summon.name != summonData.name || summon.number != 0 || summon.color != SummonColor.custom);
    if (!summonData.level || summonData.level <= character.level) {
      let summon: Summon = new Summon(summonData.name, character.level, 0, SummonColor.custom);
      summon.maxHealth = typeof summonData.health == "number" ? summonData.health : EntityValueFunction(summonData.health, character.level);
      summon.attack = typeof summonData.attack == "number" ? summonData.attack : EntityValueFunction(summonData.attack, character.level);
      summon.movement = typeof summonData.movement == "number" ? summonData.movement : EntityValueFunction(summonData.movement, character.level);
      summon.range = typeof summonData.range == "number" ? summonData.range : EntityValueFunction(summonData.range, character.level);
      summon.health = summon.maxHealth;
      summon.state = SummonState.true;
      summon.init = false;
      this.addSummon(character, summon);
    }
  }

  draw() {
    this.game.figures.forEach((figure: Figure) => {
      if (figure instanceof Character) {
        figure.initiativeVisible = true;
      }

      if (figure instanceof Character || figure instanceof Objective) {
        if (!figure.exhausted && figure.health > 0) {
          figure.off = false;
        }
      }
    })
  }

}
