import { Component, Directive, ElementRef, Input, OnInit } from "@angular/core";
import { GameManager, gameManager } from "src/app/game/businesslogic/GameManager";
import { Condition, ConditionName, ConditionType, EntityCondition } from "src/app/game/model/Condition";
import { Entity } from "src/app/game/model/Entity";
import { Figure } from "src/app/game/model/Figure";
import { Monster } from "src/app/game/model/Monster";
import { MonsterEntity } from "src/app/game/model/MonsterEntity";

@Component({
  selector: 'ghs-conditions',
  templateUrl: './conditions.html',
  styleUrls: [ './conditions.scss' ]
})
export class ConditionsComponent implements OnInit {

  @Input() entity!: Entity;
  @Input() figure!: Figure;
  @Input() type!: string;

  gameManager: GameManager = gameManager;

  standardNegative: Condition[] = [];
  upgradeNegative: Condition[] = [];
  stackNegative: Condition[] = [];
  standardPositive: Condition[] = [];
  upgradePositive: Condition[] = [];
  stackPositive: Condition[] = [];

  constructor() {
    gameManager.uiChange.subscribe({
      next: (value: boolean) => {
        this.initializeConditions;
      }
    })
  }

  ngOnInit(): void {
    this.initializeConditions();
  }

  initializeConditions() {
    this.standardNegative = gameManager.conditionsForTypes('standard', 'negative', this.type);
    this.upgradeNegative = gameManager.conditionsForTypes('upgrade', 'negative', this.type);
    this.stackNegative = gameManager.conditionsForTypes('stack', 'negative', this.type);
    this.standardPositive = gameManager.conditionsForTypes('standard', 'positive', this.type);
    this.upgradePositive = gameManager.conditionsForTypes('upgrade', 'positive', this.type);
    this.stackPositive = gameManager.conditionsForTypes('stack', 'positive', this.type);
  }

  hasCondition(condition: Condition) {
    return gameManager.entityManager.hasCondition(this.entity, condition);
  }

  isImmune(conditionName: ConditionName) {

    if (!(this.figure instanceof Monster)) {
      return false;
    }

    if (!(this.entity instanceof MonsterEntity)) {
      return false;
    }

    return gameManager.entityManager.isImmune(this.figure, this.entity, conditionName);
  }

  inc(condition: Condition) {
    condition.value = this.getValue(condition) + 1;
    this.checkUpdate(condition);
  }

  dec(condition: Condition) {
    condition.value = this.getValue(condition) - 1;
    if (condition.value < 1) {
      condition.value = 1;
    }
    this.checkUpdate(condition);
  }

  getValue(condition: Condition): number {
    const entityCondition = this.entity.entityConditions.find((entityCondition: EntityCondition) => entityCondition.name == condition.name && !entityCondition.expired);

    if (entityCondition) {
      return entityCondition.value;
    }

    return condition.value;
  }

  checkUpdate(condition: Condition) {
    const entityCondition = this.entity.entityConditions.find((entityCondition: EntityCondition) => entityCondition.name == condition.name && !entityCondition.expired);
    if (entityCondition) {
      gameManager.stateManager.before();
      entityCondition.value = condition.value;
      gameManager.stateManager.after();
    }
  }

  toggleCondition(condition: Condition) {
    gameManager.stateManager.before();
    gameManager.entityManager.toggleCondition(this.entity, condition, this.figure.active, this.figure.off);
    gameManager.stateManager.after();
  }
}


@Component({
  selector: 'ghs-highlight-conditions',
  templateUrl: './highlight.html',
  styleUrls: [ './highlight.scss' ]
})
export class HighlightConditionsComponent {

  @Input() entity!: Entity;

  gameManager: GameManager = gameManager;
  ConditionType = ConditionType;

  applyCondition(name: ConditionName, event: any) {
    event.stopPropagation();
    gameManager.stateManager.before();
    gameManager.entityManager.applyCondition(this.entity, name)
    gameManager.stateManager.after();
  }

  declineApplyCondition(name: ConditionName, event: any) {
    event.stopPropagation();
    gameManager.stateManager.before();
    gameManager.entityManager.declineApplyCondition(this.entity, name)
    gameManager.stateManager.after();
  }

}

@Directive({
  selector: '[conditionHighlight]'
})
export class ConditionHighlightAnimationDirective implements OnInit {


  @Input('conditionHighlight') condition!: EntityCondition;

  constructor(private el: ElementRef) { }

  ngOnInit(): void {
    this.el.nativeElement.classList.add("animation");
    setTimeout(() => {
      this.el.nativeElement.classList.remove("animation");
      if (this.condition.types.indexOf(ConditionType.turn) != -1) {
        this.condition.highlight = false;
        gameManager.stateManager.after();
      }
    }, 1500);
  }

}