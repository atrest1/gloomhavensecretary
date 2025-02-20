import { ChangeDetectorRef, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CharacterManager } from 'src/app/game/businesslogic/CharacterManager';
import { GameManager, gameManager } from 'src/app/game/businesslogic/GameManager';
import { settingsManager } from 'src/app/game/businesslogic/SettingsManager';
import { Character } from 'src/app/game/model/Character';
import { Condition, ConditionType } from 'src/app/game/model/Condition';
import { EntityValueFunction } from 'src/app/game/model/Entity';
import { GameState } from 'src/app/game/model/Game';
import { Summon } from 'src/app/game/model/Summon';
import { DialogComponent } from '../../dialog/dialog';

@Component({
  selector: 'ghs-character',
  templateUrl: './character.html',
  styleUrls: [ './character.scss', '../../dialog/dialog.scss' ]
})
export class CharacterComponent extends DialogComponent {

  @Input() character!: Character;

  @ViewChild('charactertitle', { static: false }) titleInput!: ElementRef;

  gameManager: GameManager = gameManager;
  characterManager: CharacterManager = gameManager.characterManager;

  GameState = GameState;
  ConditionType = ConditionType;
  health: number = 0;
  experience: number = 0;
  loot: number = 0;
  levelDialog: boolean = false;
  levels: number[] = [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ];

  allowToggle: boolean = true;
  dragHp: number = 0;

  constructor(private changeDetectorRef: ChangeDetectorRef) {
    super();
  }

  emptySummons(): boolean {
    return this.character.summons.length == 0 || this.character.summons.every((summon: Summon) => summon.dead);
  }

  changeHealth(value: number) {
    const old = this.character.health;
    gameManager.entityManager.changeHealth(this.character, value);
    this.health += this.character.health - old;
  }

  changeExperience(value: number) {
    gameManager.stateManager.before();
    this.character.experience += value;
    this.experience += value;

    if (this.character.experience <= 0) {
      this.character.experience = 0;
    }
    gameManager.stateManager.after();
  }

  changeLoot(value: number) {
    gameManager.stateManager.before();
    this.character.loot += value;
    this.loot += value;

    if (this.character.loot <= 0) {
      this.character.loot = 0;
    }
    gameManager.stateManager.after();
  }

  hasCondition(condition: Condition) {
    return gameManager.entityManager.hasCondition(this.character, condition);
  }

  toggleCondition(condition: Condition) {
    gameManager.stateManager.before();
    gameManager.entityManager.toggleCondition(this.character, condition, this.character.active, this.character.off);
    gameManager.stateManager.after();
  }

  toggleExhausted() {
    gameManager.stateManager.before();
    this.exhausted();
    gameManager.stateManager.after();
  }

  exhausted() {
    this.character.exhausted = !this.character.exhausted;
    if (this.character.exhausted) {
      this.character.off = true;
      this.character.active = false;
    } else {
      this.character.off = false;
    }
    gameManager.sortFigures();
  }

  openLevelDialog() {
    this.levelDialog = true;
    this.changeDetectorRef.detectChanges();
    this.titleInput.nativeElement.value = this.character.title || settingsManager.getLabel('data.character.' + this.character.name.toLowerCase());
  }


  changeMaxHealth(value: number) {
    gameManager.stateManager.before();
    this.character.maxHealth += value;

    if (this.character.maxHealth <= 1) {
      this.character.maxHealth = 1;
    }

    if (value < 0) {
      this.character.health = this.character.maxHealth;
    }
    gameManager.stateManager.after();
  }

  setLevel(level: number) {
    gameManager.stateManager.before();
    this.characterManager.setLevel(this.character, level);
    gameManager.stateManager.after();
  }

  dragHpMove(value: number) {
    if (settingsManager.settings.dragHealth) {
      const old = this.character.health;
      this.character.health += Math.floor(value / 4) - this.dragHp;
      if (this.character.health > this.character.maxHealth) {
        this.character.health = EntityValueFunction("" + this.character.maxHealth);
      } else if (this.character.health < 0) {
        this.character.health = 0;
      }
      this.dragHp += this.character.health - old;
    }
  }

  dragHpEnd() {
    if (settingsManager.settings.dragHealth) {
      if (this.dragHp != 0) {
        this.character.health -= this.dragHp;
        gameManager.stateManager.before();
        this.changeHealth(this.dragHp);
        if (this.character.health <= 0 || this.character.exhausted && this.dragHp >= 0 && this.character.health > 0) {
          this.exhausted();
        }
        this.dragHp = 0;
        this.health = 0;
      }
      setTimeout(() => {
        this.allowToggle = true;
      }, 200);
      gameManager.stateManager.after();
    }
  }

  dragTimeout(timeout: boolean) {
    this.allowToggle = timeout;
  }

  override toggle(): void {
    if (!settingsManager.settings.dragHealth || this.allowToggle) {
      super.toggle();
      this.allowToggle = true;
    }
  }

  override close(): void {
    super.close();

    if (this.health != 0) {
      this.character.health -= this.health;
      gameManager.stateManager.before();
      this.changeHealth(this.health);
      if (this.character.health <= 0 || this.character.exhausted && this.health >= 0 && this.character.health > 0) {
        this.exhausted();
      }
      this.dragHp = 0;
      this.health = 0;
      gameManager.stateManager.after();
    }
    this.experience = 0;
    this.loot = 0;
    if (this.levelDialog && this.titleInput) {
      if (this.titleInput.nativeElement.value && this.titleInput.nativeElement.value != settingsManager.getLabel('data.character.' + this.character.name.toLowerCase())) {
        if (this.character.title != this.titleInput.nativeElement.value) {
          gameManager.stateManager.before();
          this.character.title = this.titleInput.nativeElement.value;
          gameManager.stateManager.after();
        }
      } else if (this.character.title != "") {
        gameManager.stateManager.before();
        this.character.title = "";
        gameManager.stateManager.after();
      }
    }

    this.levelDialog = false;
  }

}