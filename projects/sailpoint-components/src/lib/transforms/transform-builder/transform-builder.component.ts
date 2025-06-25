import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import {
  Designer,
  RootEditorContext,
  RootEditorProvider,
  StepEditorContext,
  StepEditorProvider,
  StepsConfiguration,
  ToolboxConfiguration,
  Uid,
  ValidatorConfiguration,
} from 'sequential-workflow-designer';
import { SequentialWorkflowDesignerModule } from 'sequential-workflow-designer-angular';
import { EditorProvider } from 'sequential-workflow-editor';
import {
  ChoiceValueModelConfiguration,
  createDefinitionModel,
  createRootModel,
  createStringValueModel,
  DefinitionModel,
} from 'sequential-workflow-editor-model';
import {
  Branches,
  Definition,
  Properties,
  Step,
} from 'sequential-workflow-model';
import {
  createAccountAttribute,
  createAccountAttributeModel,
  deserializeAccountAttribute,
  getAccountAttributeIcon,
  getAvailableSources,
  isAccountAttributeStep,
  serializeAccountAttribute,
} from './models/account-attribute';
import {
  ConcatModel,
  createConcat,
  deserializeConcat,
  getConcatIcon,
  isConcatStep,
  serializeConcat,
} from './models/concat';
import {
  createStatic,
  deserializeStatic,
  getStaticIcon,
  isStaticStep,
  serializeStatic,
  StaticModel,
} from './models/static';

import { FormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  MatSlideToggleChange,
  MatSlideToggleModule,
} from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { debounceTime, Subject, takeUntil } from 'rxjs';
import {
  TransformReadV2025,
  TransformsV2025ApiCreateTransformRequest,
  TransformsV2025ApiUpdateTransformRequest,
} from 'sailpoint-api-client';
import { GenericDialogComponent } from '../../generic-dialog/generic-dialog.component';
import { SailPointSDKService } from '../../sailpoint-sdk.service';
import { AutoSaveService } from '../transform-builder/utils/autosave.service'; // Adjust path as needed
import {
  ConditionalModel,
  createConditional,
  deserializeConditional,
  getConditionalIcon,
  isConditionalStep,
  serializeConditional,
} from './models/conditional';
import {
  createDateCompare,
  DateCompareModel,
  deserializeDateCompare,
  getDateCompareIcon,
  isDateCompareStep,
  operatorMap,
  serializeDateCompare,
} from './models/date-compare';
import {
  createDateFormat,
  DateFormatMap,
  DateFormatModel,
  deserializeDateFormat,
  getDateFormatIcon,
  isDateFormatStep,
  serializeDateFormat,
} from './models/date-format';
import {
  createDateMath,
  DateMathModel,
  deserializeDateMath,
  getDateMathIcon,
  isDateMathStep,
  serializeDateMath,
} from './models/date-math';
import {
  createDecomposeDiacriticalMarks,
  deserializeDecomposeDiacriticalMarks,
  isDecomposeDiacriticalMarksStep,
  serializeDecomposeDiacriticalMarks,
} from './models/decompose-diacritical-marks';
import {
  createE164Phone,
  deserializeE164Phone,
  E164PhoneModel,
  getE164PhoneIcon,
  isE164PhoneStep,
  isoAlpha2Map,
  serializeE164Phone,
} from './models/e164-phone';
import {
  createFirstValid,
  deserializeFirstValid,
  FirstValidModel,
  getFirstValidIcon,
  isFirstValidStep,
  serializeFirstValid,
} from './models/first-valid';
import {
  createGenerateRandomString,
  deserializeGenerateRandomString,
  GenerateRandomStringModel,
  isGenerateRandomStringStep,
  serializeGenerateRandomString,
} from './models/generate-random-string';
import {
  createGetEndOfString,
  deserializeGetEndOfString,
  GetEndOfStringModel,
  isGetEndOfStringStep,
  serializeGetEndOfString,
} from './models/get-end-of-string';
import {
  createGetReferenceIdentityAttribute,
  deserializeGetReferenceIdentityAttribute,
  GetReferenceIdentityAttributeModel,
  isGetReferenceIdentityAttributeStep,
  serializeGetReferenceIdentityAttribute,
} from './models/get-reference-identity-attribute';
import {
  createIdentityAttribute,
  deserializeIdentityAttribute,
  getIdentityAttributeIcon,
  IdentityAttributeModel,
  isIdentityAttributeStep,
  serializeIdentityAttribute,
} from './models/identity-attribute';
import {
  createIndexOf,
  deserializeIndexOf,
  IndexOfModel,
  isIndexOfStep,
  serializeIndexOf,
} from './models/index-of';
import {
  createISO3166,
  deserializeISO3166,
  isISO3166Step,
  iso3166Map,
  ISO3166Model,
  serializeISO3166,
} from './models/iso-3166';
import {
  createLastIndexOf,
  deserializeLastIndexOf,
  isLastIndexOfStep,
  LastIndexOfModel,
  serializeLastIndexOf,
} from './models/last-index-of';
import {
  createLeftPad,
  deserializeLeftPad,
  getLeftPadIcon,
  isLeftPadStep,
  LeftPadModel,
  serializeLeftPad,
} from './models/left-pad';
import {
  createLookup,
  deserializeLookup,
  getLookupIcon,
  isLookupStep,
  serializeLookup,
} from './models/lookup';
import {
  createLower,
  deserializeLower,
  getLowerIcon,
  isLowerStep,
  serializeLower,
} from './models/lower';
import {
  createNameNormalizer,
  deserializeNameNormalizer,
  isNameNormalizerStep,
  serializeNameNormalizer,
} from './models/name-normalizer';
import {
  createRandomAlphaNumeric,
  deserializeRandomAlphaNumeric,
  getRandomAlphaNumericIcon,
  isRandomAlphaNumericStep,
  RandomAlphaNumericModel,
  serializeRandomAlphaNumeric,
} from './models/random-alphanumeric';
import {
  createRandomNumeric,
  deserializeRandomNumeric,
  isRandomNumericStep,
  RandomNumericModel,
  serializeRandomNumeric,
} from './models/random-numeric';
import {
  createReference,
  createReferenceStepModel,
  deserializeReference,
  getAvailableTransforms,
  getReferenceIcon,
  isReferenceStep,
  serializeReference,
} from './models/reference';
import {
  createReplace,
  deserializeReplace,
  getReplaceIcon,
  isReplaceStep,
  serializeReplace,
} from './models/replace';
import {
  createReplaceAll,
  deserializeReplaceAll,
  getReplaceAllIcon,
  isReplaceAllStep,
  serializeReplaceAll,
} from './models/replace-all';
import {
  createRFC5646,
  deserializeRFC5646,
  isRFC5646Step,
  serializeRFC5646,
} from './models/rfc-5646';
import {
  createRightPad,
  deserializeRightPad,
  getRightPadIcon,
  isRightPadStep,
  serializeRightPad,
} from './models/right-pad';
import {
  createRule,
  createRuleStepModel,
  deserializeRule,
  getAvailableRules,
  isRuleStep,
  serializeRule,
} from './models/rule';
import {
  createSplit,
  deserializeSplit,
  getSplitIcon,
  isSplitStep,
  serializeSplit,
  SplitModel,
} from './models/split';
import {
  createString,
  deserializeString,
  getStringIcon,
  isStringStep,
  StringModel,
} from './models/string';
import {
  createSubString,
  deserializeSubString,
  getSubStringIcon,
  isSubStringStep,
  serializeSubString,
  SubStringModel,
} from './models/substring';
import {
  createTrim,
  deserializeTrim,
  getTrimIcon,
  isTrimStep,
  serializeTrim,
} from './models/trim';
import {
  createUpper,
  deserializeUpper,
  getUpperIcon,
  isUpperStep,
  serializeUpper,
} from './models/upper';
import {
  createUUID,
  deserializeUUID,
  getUUIDIcon,
  isUUIDStep,
  serializeUUID,
} from './models/uuid';
import { MapEditorDialogComponent } from './utils/map-editor-dialog.component';
import { TransformPreviewComponent } from './utils/transform-preview.component';

interface StepDefinition {
  id: string;
  name: string;
  type: string;
  componentType: string;
  properties: Record<string, any>;
  sequence?: StepDefinition[];
  branches?: Record<string, StepDefinition[]>;
}

interface WorkflowDefinition {
  properties: Record<string, any>;
  sequence: StepDefinition[];
}

// Result type for enhanced search with path information
interface StepSearchResult {
  step: StepDefinition;
  path: (string | number)[];
  sequence: StepDefinition[];
  index: number;
}

export interface MyDefinition extends Definition {
  properties: {
    name: string;
  };
}

export const rootModel = createRootModel<MyDefinition>((root) => {
  root
    .property('name')
    .value(
      createStringValueModel({
        defaultValue: 'lorem ipsum',
      })
    )
    .label('Transform Name');
});

function createDefinition(): Definition {
  return {
    properties: {
      name: 'Transform Name',
    },
    sequence: [createAccountAttribute()],
  };
}

function createMyDefinitionModel(configuration: {
  sources: string[];
  transforms: string[];
  rules: string[];
}): DefinitionModel<Definition> {
  return createDefinitionModel((model) => {
    model.root(rootModel);
    model.steps([
      createAccountAttributeModel(configuration.sources),
      ConcatModel,
      ConditionalModel,
      DateCompareModel,
      DateFormatModel,
      DateMathModel,
      E164PhoneModel,
      FirstValidModel,
      GenerateRandomStringModel,
      GetEndOfStringModel,
      GetReferenceIdentityAttributeModel,
      IdentityAttributeModel,
      IndexOfModel,
      ISO3166Model,
      LastIndexOfModel,
      LeftPadModel,
      RandomAlphaNumericModel,
      RandomNumericModel,
      createReferenceStepModel(configuration.transforms),
      createRuleStepModel(configuration.rules),
      StaticModel,
      StringModel,
      SplitModel,
      SubStringModel,
    ]);
  });
}

export const serializeStep = (step: Step) => {
  if (isAccountAttributeStep(step)) {
    return serializeAccountAttribute(step);
  } else if (isConcatStep(step)) {
    return serializeConcat(step);
  } else if (isStaticStep(step)) {
    return serializeStatic(step);
  } else if (isStringStep(step)) {
    return step.properties.value;
  } else if (isConditionalStep(step)) {
    return serializeConditional(step);
  } else if (isDateCompareStep(step)) {
    return serializeDateCompare(step);
  } else if (isDateFormatStep(step)) {
    return serializeDateFormat(step);
  } else if (isDateMathStep(step)) {
    return serializeDateMath(step);
  } else if (isFirstValidStep(step)) {
    return serializeFirstValid(step);
  } else if (isDecomposeDiacriticalMarksStep(step)) {
    return serializeDecomposeDiacriticalMarks(step);
  } else if (isE164PhoneStep(step)) {
    return serializeE164Phone(step);
  } else if (isGenerateRandomStringStep(step)) {
    return serializeGenerateRandomString(step);
  } else if (isGetEndOfStringStep(step)) {
    return serializeGetEndOfString(step);
  } else if (isGetReferenceIdentityAttributeStep(step)) {
    return serializeGetReferenceIdentityAttribute(step);
  } else if (isIdentityAttributeStep(step)) {
    return serializeIdentityAttribute(step);
  } else if (isIndexOfStep(step)) {
    return serializeIndexOf(step);
  } else if (isISO3166Step(step)) {
    return serializeISO3166(step);
  } else if (isLastIndexOfStep(step)) {
    return serializeLastIndexOf(step);
  } else if (isLeftPadStep(step)) {
    return serializeLeftPad(step);
  } else if (isLookupStep(step)) {
    return serializeLookup(step);
  } else if (isLowerStep(step)) {
    return serializeLower(step);
  } else if (isNameNormalizerStep(step)) {
    return serializeNameNormalizer(step);
  } else if (isRandomAlphaNumericStep(step)) {
    return serializeRandomAlphaNumeric(step);
  } else if (isRandomNumericStep(step)) {
    return serializeRandomNumeric(step);
  } else if (isReferenceStep(step)) {
    return serializeReference(step);
  } else if (isReplaceAllStep(step)) {
    return serializeReplaceAll(step);
  } else if (isReplaceStep(step)) {
    return serializeReplace(step);
  } else if (isRFC5646Step(step)) {
    return serializeRFC5646(step);
  } else if (isRightPadStep(step)) {
    return serializeRightPad(step);
  } else if (isRuleStep(step)) {
    return serializeRule(step);
  } else if (isSplitStep(step)) {
    return serializeSplit(step);
  } else if (isSubStringStep(step)) {
    return serializeSubString(step);
  } else if (isTrimStep(step)) {
    return serializeTrim(step);
  } else if (isUpperStep(step)) {
    return serializeUpper(step);
  } else if (isUUIDStep(step)) {
    return serializeUUID(step);
  }
  throw new Error(`Unsupported step type: ${step.type}`);
};

export function createDefinitionFromTransform(data: any): Definition {
  return {
    properties: {
      name: data.name,
    },
    sequence: [deserializeToStep(data)],
  };
}

type Deserializer = (data: any) => Step;

const deserializers: Record<string, Deserializer> = {
  accountAttribute: deserializeAccountAttribute,
  concat: deserializeConcat,
  static: deserializeStatic,
  conditional: deserializeConditional,
  dateCompare: deserializeDateCompare,
  dateFormat: deserializeDateFormat,
  dateMath: deserializeDateMath,
  firstValid: deserializeFirstValid,
  decomposeDiacriticalMarks: deserializeDecomposeDiacriticalMarks,
  e164phone: deserializeE164Phone,
  generateRandomString: deserializeGenerateRandomString,
  getEndOfString: deserializeGetEndOfString,
  getReferenceIdentityAttribute: deserializeGetReferenceIdentityAttribute,
  identityAttribute: deserializeIdentityAttribute,
  indexOf: deserializeIndexOf,
  iso3166: deserializeISO3166,
  lastIndexOf: deserializeLastIndexOf,
  leftPad: deserializeLeftPad,
  lookup: deserializeLookup,
  lower: deserializeLower,
  nameNormailizer: deserializeNameNormalizer,
  randomAlphaNumeric: deserializeRandomAlphaNumeric,
  randomNumeric: deserializeRandomNumeric,
  reference: deserializeReference,
  replaceAll: deserializeReplaceAll,
  replace: deserializeReplace,
  rfc5646: deserializeRFC5646,
  rightPad: deserializeRightPad,
  rule: deserializeRule,
  split: deserializeSplit,
  substring: deserializeSubString,
  trim: deserializeTrim,
  upper: deserializeUpper,
  uuid: deserializeUUID,
};

export function deserializeToStep(data: any): Step {
  if (typeof data === 'string') {
    return deserializeString(data);
  }

  const deserializer = deserializers[data.type];
  if (deserializer) {
    return deserializer(data);
  }

  throw new Error(`Unsupported step type: ${data.type}`);
}
@Component({
  selector: 'app-transform-builder',
  standalone: true,
  imports: [
    SequentialWorkflowDesignerModule,
    CommonModule,
    MatFormField,
    MatInputModule,
    MatButtonModule,
    RouterModule,
    FormsModule,
    MatSlideToggleModule,
    MatIconModule,
    MatSelectModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatBadgeModule,
  ],
  templateUrl: './transform-builder.component.html',
  styleUrl: './transform-builder.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class TransformBuilderComponent implements OnInit, OnDestroy {
  @Input() transform?: TransformReadV2025;

  private destroy$ = new Subject<void>();
  private autoSaveSubject = new Subject<Definition>();

  private designer?: Designer;
  public validatorConfiguration?: ValidatorConfiguration;
  public stepEditorProvider?: StepEditorProvider;
  public rootEditorProvider?: RootEditorProvider;
  public definition?: Definition;
  public definitionJSON?: string;
  public isToolboxCollapsed = false;
  public isEditorCollapsed = false;
  private defaultStepEditorProvider?: StepEditorProvider;
  public isValid?: boolean;
  public customInputDate?: string;
  public preview?: string;
  public isReadonly = false;
  public definitionModel?: DefinitionModel<Definition>;
  public isReady = false;
  public sourceMap = new Map<string, string>();

  // Auto-save related properties
  public isSaving = false;
  public isSyncing = false;
  public lastAutoSave?: string;
  public hasUnsavedChanges = false;
  public isNewTransform = false;

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private sdk: SailPointSDKService,
    private autoSaveService: AutoSaveService,
    private snackBar: MatSnackBar
  ) {}

  getDefaultFallbackIcon(): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
      <path d="M0 0h24v24H0V0z" fill="none"/>
      <path fill="gray" d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
    </svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
  }

  public readonly stepsConfiguration: StepsConfiguration = {
    iconUrlProvider: (componentType, type) => {
      const iconMap: Record<string, () => string> = {
        accountAttribute: getAccountAttributeIcon,
        concat: getConcatIcon,
        firstValid: getFirstValidIcon,
        static: getStaticIcon,
        conditional: getConditionalIcon,
        dateCompare: getDateCompareIcon,
        dateFormat: getDateFormatIcon,
        dateMath: getDateMathIcon,
        e164phone: getE164PhoneIcon,
        identityAttribute: getIdentityAttributeIcon,
        lookup: getLookupIcon,
        leftPad: getLeftPadIcon,
        randomAlphaNumeric: getRandomAlphaNumericIcon,
        randomNumeric: getRandomAlphaNumericIcon,
        reference: getReferenceIcon,
        replaceAll: getReplaceAllIcon,
        replace: getReplaceIcon,
        rightPad: getRightPadIcon,
        split: getSplitIcon,
        substring: getSubStringIcon,
        trim: getTrimIcon,
        lower: getLowerIcon,
        upper: getUpperIcon,
        uuid: getUUIDIcon,
        string: getStringIcon,
      };

      const iconFn = iconMap[type];
      if (iconFn) {
        return iconFn();
      }

      return this.getDefaultFallbackIcon();
    },

    canInsertStep: (step, targetSequence, targetIndex) => {
      const stepType = step.type;

      // Check if trying to insert after a single task type step
      if (targetIndex > 0) {
        const previousStep = targetSequence[targetIndex - 1];
        if (previousStep.componentType === 'task') {
          this.openMessageDialog(
            `Cannot insert step of type "${stepType}" directly after a transform that does not take user input.`,
            'Cannot insert step'
          );
          return false; // Cannot insert after these step types
        }

        // Existing logic: Check for same type directly above
        if (previousStep.type === stepType) {
          this.openMessageDialog(
            `Cannot insert step of type "${stepType}" directly after another step of the same type.`,
            'Cannot insert step Above'
          );
          return false; // Same type directly above
        }
      }

      // Check the step that would be directly below (next)
      if (targetIndex < targetSequence.length) {
        const nextStep = targetSequence[targetIndex];
        if (nextStep.type === stepType) {
          this.openMessageDialog(
            `Cannot insert step of type "${stepType}" directly after another step of the same type.`,
            'Cannot insert step Below'
          );
          return false; // Same type directly below
        }
      }

      return true; // Allow insertion
    },

    canMoveStep: (sourceSequence, step, targetSequence, targetIndex) => {
      const stepType = step.type;

      // Check if trying to move after accountAttribute or identityAttribute
      if (targetIndex > 0) {
        const previousStep = targetSequence[targetIndex - 1];
        if (
          previousStep.type === 'accountAttribute' ||
          previousStep.type === 'identityAttribute'
        ) {
          console.log(
            `Cannot move step of type "${stepType}" directly after accountAttribute or identityAttribute.`
          );
          return false; // Cannot move after these step types
        }
      }

      // Check adjacent positions in target sequence
      const previousStep =
        targetIndex > 0 ? targetSequence[targetIndex - 1] : null;
      const nextStep =
        targetIndex < targetSequence.length
          ? targetSequence[targetIndex]
          : null;

      if (
        (previousStep && previousStep.type === stepType) ||
        (nextStep && nextStep.type === stepType)
      ) {
        return false;
      }

      return true;
    },
  };

  public readonly toolboxConfiguration: ToolboxConfiguration = {
    groups: [
      {
        name: 'Transforms',
        steps: [
          createAccountAttribute(),
          createConcat(),
          createConditional(),
          createDateCompare(),
          createDateFormat(),
          createDateMath(),
          createDecomposeDiacriticalMarks(),
          createE164Phone(),
          createFirstValid(),
          createGenerateRandomString(),
          createGetEndOfString(),
          createGetReferenceIdentityAttribute(),
          createIdentityAttribute(),
          createIndexOf(),
          createISO3166(),
          createLastIndexOf(),
          createLeftPad(),
          createLookup(),
          createLower(),
          createNameNormalizer(),
          createRandomAlphaNumeric(),
          createRandomNumeric(),
          createReference(),
          createReplaceAll(),
          createReplace(),
          createRFC5646(),
          createRightPad(),
          createRule(),
          createSplit(),
          createStatic(),
          createSubString(),
          createTrim(),
          createUpper(),
          createUUID(),
        ],
      },
      {
        name: 'Primitives',
        steps: [createString()],
      },
    ],
  };

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public ngOnInit(): void {
    if (!this.transform) {
      this.definition = createDefinition();
      this.isNewTransform = true;
    } else {
      this.definition = createDefinitionFromTransform(this.transform);
      this.isReadonly = false;
    }

    this.updateDefinitionJSON();

    // Set up auto-save debouncing
    this.autoSaveSubject
      .pipe(
        debounceTime(2000), // Wait 2 seconds after last change
        takeUntil(this.destroy$)
      )
      .subscribe((definition) => {
        this.performAutoSave(definition);
      });

    void (async () => {
      try {
        const [sourcesResult, transforms, rules] = await Promise.all([
          getAvailableSources(this.sdk),
          getAvailableTransforms(this.sdk),
          getAvailableRules(this.sdk),
        ]);

        this.sourceMap = sourcesResult.map;

        const model = createMyDefinitionModel({
          sources: sourcesResult.names,
          transforms,
          rules,
        });
        if (!model) {
          throw new Error('Failed to create DefinitionModel.');
        }

        this.definitionModel = model;

        const editorProvider = EditorProvider.create(this.definitionModel, {
          uidGenerator: () => Uid.next(),
        });

        this.rootEditorProvider = editorProvider.createRootEditorProvider();
        this.stepEditorProvider = editorProvider.createStepEditorProvider();

        this.validatorConfiguration = {
          root: editorProvider.createRootValidator(),
          step: editorProvider.createStepValidator(),
        };

        this.isReady = true;
      } catch (error) {
        console.error('Failed during ngOnInit async setup:', error);
      }
    })();
  }

  // private loadFromLocalSaveIfExists(): void {
  //   if (!this.transform) return;

  //   const localSave = this.autoSaveService.getLocalSave(this.transform.id!);
  //   if (localSave) {
  //     // Ask user if they want to restore
  //     const shouldRestore = confirm(
  //       `Found local changes from ${this.autoSaveService.getTimeSinceLastSave(
  //         this.transform.id!
  //       )}. ` + 'Would you like to restore these changes?'
  //     );

  //     if (shouldRestore) {
  //       this.definition = {
  //         properties: { name: localSave.name },
  //         sequence: [deserializeToStep(localSave.definition)],
  //       };
  //       this.hasUnsavedChanges = true;
  //       this.snackBar.open('Restored local changes', 'Close', {
  //         duration: 3000,
  //       });
  //     } else {
  //       // Clear the local save since user doesn't want it
  //       this.autoSaveService.clearLocalSave(this.transform.id!);
  //     }
  //   }
  // }

  private performAutoSave(definition: Definition): void {
    if (!definition?.sequence?.[0]) return;

    this.isSaving = true;

    try {
      const serializedTransform = serializeStep(definition.sequence[0]);
      const transformId = this.isNewTransform
        ? 'new_transform'
        : this.transform?.id || 'unknown';
      const transformName = String(
        definition.properties?.name || 'Untitled Transform'
      );

      this.autoSaveService.autoSave(
        transformId,
        transformName,
        serializedTransform,
        this.isNewTransform,
        this.transform // Store original cloud version for comparison
      );

      const lastSave = this.autoSaveService.getTimeSinceLastSave(
        transformId,
        this.isNewTransform
      );
      this.lastAutoSave = lastSave === null ? undefined : lastSave;

      // Update UI to show last save time
      setTimeout(() => {
        const lastSave = this.autoSaveService.getTimeSinceLastSave(
          transformId,
          this.isNewTransform
        );
        this.lastAutoSave = lastSave === null ? undefined : lastSave;
      }, 1000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      this.snackBar.open('Auto-save failed', 'Close', { duration: 3000 });
    } finally {
      this.isSaving = false;
    }
  }

  public async saveToCloud(): Promise<void> {
    if (!this.definition?.sequence?.[0]) {
      this.snackBar.open('Nothing to save', 'Close', { duration: 3000 });
      return;
    }

    this.isSyncing = true;

    try {
      let serializedTransform = serializeStep(this.definition.sequence[0]);

      let newTransform: TransformReadV2025 =
        serializedTransform as TransformReadV2025;

      newTransform.name = String(
        this.definition?.properties?.name ?? newTransform.name
      );
      console.log('Saving transform to cloud:', newTransform);

      // If the transform already exists, update it
      if (this.transform?.id) {
        const transformUpdateRequest: TransformsV2025ApiUpdateTransformRequest =
          {
            transformV2025: newTransform,
            id: this.transform?.id,
          };

        await this.sdk.updateTransform(transformUpdateRequest);

        this.autoSaveService.clearLocalSave(this.transform.id);

        this.snackBar.open(
          `Transform "${newTransform.name}" updated successfully`,
          'Close',
          { duration: 3000 }
        );
      } else {
        // If it's a new transform, create it
        const createTransformRequest: TransformsV2025ApiCreateTransformRequest =
          {
            transformV2025: newTransform,
          };

        const response = await this.sdk.createTransform(createTransformRequest);

        this.transform = response.data;
        this.isNewTransform = false;
        this.autoSaveService.clearLocalSave('new_transform', true);
        this.snackBar.open('Transform created successfully', 'Close', {
          duration: 3000,
        });
      }

      this.hasUnsavedChanges = false;
    } catch (error) {
      console.error('Save to cloud failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.snackBar.open(`Failed to sync: ${errorMessage}`, 'Close', {
        duration: 5000,
      });
    } finally {
      this.isSyncing = false;
    }
  }

  public hasLocalChanges(): boolean {
    if (this.isNewTransform) {
      return this.hasUnsavedChanges;
    }

    const id = this.transform?.id;
    if (!id) return false;

    const localSave = this.autoSaveService.getLocalSave(id);
    if (!localSave) return false;

    // Compare definitions to avoid false positive
    const parsedDef = JSON.parse(this.definitionJSON ?? '{}');
    return this.autoSaveService.hasUnsavedChanges(id, parsedDef);
  }

  public restoreFromCloud(): void {
    if (!this.transform) return;

    const shouldRestore = confirm(
      'This will discard all local changes and restore the transform from the cloud. Are you sure?'
    );

    if (shouldRestore) {
      this.definition = createDefinitionFromTransform(this.transform);
      this.updateDefinitionJSON();
      this.hasUnsavedChanges = false;

      if (this.transform.id) {
        this.autoSaveService.clearLocalSave(this.transform.id);
      }

      this.snackBar.open('Restored from cloud', 'Close', { duration: 3000 });
    }
  }

  public discardLocalChanges(): void {
    const shouldDiscard = confirm(
      'This will discard all local changes. Are you sure?'
    );

    if (shouldDiscard) {
      const transformId = this.isNewTransform
        ? 'new_transform'
        : this.transform?.id || 'unknown';
      this.autoSaveService.clearLocalSave(transformId, this.isNewTransform);

      if (this.transform) {
        this.definition = createDefinitionFromTransform(this.transform);
        this.updateDefinitionJSON();
      } else {
        this.definition = createDefinition();
        this.updateDefinitionJSON();
      }

      this.hasUnsavedChanges = false;
      this.snackBar.open('Local changes discarded', 'Close', {
        duration: 3000,
      });
    }
  }

  public onDesignerReady(designer: Designer) {
    this.designer = designer;
    this.updateIsValid();
  }

  public onDefinitionChanged(definition: Definition) {
    this.definition = definition;
    this.updateDefinitionJSON();

    if (this.transform?.id) {
      const parsedDef = JSON.parse(this.definitionJSON ?? '{}');

      const hasChanges = this.autoSaveService.hasUnsavedChanges(
        this.transform.id,
        parsedDef
      );

      this.hasUnsavedChanges = hasChanges;
    } else {
      this.hasUnsavedChanges = false;
    }

    this.autoSaveSubject.next(definition);
  }

  private updateDefinitionJSON() {
    const transformedResult = this.definition?.sequence?.[0]
      ? serializeStep(this.definition.sequence[0])
      : undefined;
    this.definitionJSON = JSON.stringify(transformedResult, null, 2);
  }

  public toggleToolboxClicked() {
    this.isToolboxCollapsed = !this.isToolboxCollapsed;
  }

  public toggleEditorClicked() {
    this.isEditorCollapsed = !this.isEditorCollapsed;
  }
  private updateIsValid() {
    this.isValid = this.designer?.isValid();
  }

  public toggleReadonlyClicked() {
    this.isReadonly = !this.isReadonly;
  }

  public onSelectedStepIdChanged(selectedStepId: string | null) {
    console.log('onSelectedStepIdChanged', selectedStepId);
    this.isEditorCollapsed = false;
  }

  objectKeys = Object.keys;

  isBoolean(value: any): boolean {
    return typeof value === 'boolean';
  }

  isNumber(value: any): boolean {
    if (value === '' || value === null || value === undefined) return true;
    return (
      typeof value === 'number' || (!isNaN(value) && !isNaN(parseFloat(value)))
    );
  }

  isMap(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  editMap(
    properties: Properties,
    name: string,
    context: StepEditorContext
  ): void {
    const currentMap = properties[name];

    const mapObject =
      currentMap instanceof Map ? Object.fromEntries(currentMap) : currentMap;

    const dialogRef = this.dialog.open(MapEditorDialogComponent, {
      width: '800px',
      height: '600px',
      maxWidth: 'none',
      data: { map: mapObject },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (this.isStringRecord(result)) {
        properties[name] = new Map(Object.entries(result));
        context.notifyPropertiesChanged();
      }
    });
  }

  isStringRecord(value: unknown): value is Record<string, string> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.values(value).every((v) => typeof v === 'string')
    );
  }

  togglePreview(): void {
    const selectedStepId = this.designer?.getSelectedStepId();
    const definition = this.designer?.getDefinition();

    let serializedTransform: string | undefined;

    if (selectedStepId) {
      // Serialize selected step
      if (!definition) {
        alert('Definition not found');
        return;
      }
      const selectedStep = this.findStepById(definition, selectedStepId);

      if (!selectedStep) {
        alert('Selected step not found');
        return;
      }

      serializedTransform = JSON.stringify(
        serializeStep(selectedStep),
        null,
        2
      );
    } else {
      // Serialize whole definition
      if (definition?.sequence[0]) {
        serializedTransform = JSON.stringify(
          serializeStep(definition.sequence[0]),
          null,
          2
        );
      } else {
        serializedTransform = undefined;
      }
    }

    this.dialog.open(TransformPreviewComponent, {
      width: '70%',
      height: '75%',
      maxWidth: 'none',
      data: { sdkService: this.sdk, transformDefinition: serializedTransform },
    });

    // dialogRef.afterClosed().subscribe(result => {
    // });
  }

  viewTransformDefinition(): void {
    const selectedStepId = this.designer?.getSelectedStepId();
    const definition = this.designer?.getDefinition();

    let serializedTransform: string | undefined;

    if (selectedStepId) {
      if (!definition) {
        this.openMessageDialog('Definition not found', 'Error');
        return;
      }

      const selectedStep = this.findStepById(definition, selectedStepId);

      if (!selectedStep) {
        this.openMessageDialog('Selected step not found', 'Error');
        return;
      }

      serializedTransform = JSON.stringify(
        serializeStep(selectedStep),
        null,
        2
      );
    } else if (definition?.sequence[0]) {
      serializedTransform = JSON.stringify(
        serializeStep(definition.sequence[0]),
        null,
        2
      );
    }

    if (!serializedTransform) {
      this.openMessageDialog('No transform found to display.', 'Warning');
      return;
    }

    this.dialog.open(GenericDialogComponent, {
      minWidth: '800px',
      data: {
        title: 'Transform Definition',
        message: serializedTransform,
      },
    });
  }

  // Basic findStepById function
  findStepById(definition: Definition, stepId: string): StepDefinition | null {
    function searchInSequence(
      sequence: StepDefinition[]
    ): StepDefinition | null {
      for (const step of sequence) {
        // Direct match
        if (step.id === stepId) {
          return step;
        }

        // Search in nested sequence
        if (step.sequence && Array.isArray(step.sequence)) {
          const found = searchInSequence(step.sequence);
          if (found) return found;
        }

        // Search in branches
        if (step.branches && typeof step.branches === 'object') {
          for (const branchKey in step.branches) {
            const branch = step.branches[branchKey];
            if (Array.isArray(branch)) {
              const found = searchInSequence(branch);
              if (found) return found;
            }
          }
        }
      }

      return null;
    }

    return searchInSequence(definition.sequence);
  }

  getBranchNames(branches: Record<string, any[]>): string[] {
    return Object.keys(branches || {});
  }

  public updateProperty(
    properties: Properties,
    name: string,
    event: Event | MatSlideToggleChange,
    context: RootEditorContext | StepEditorContext
  ) {
    console.log(event);
    if (event instanceof MatSlideToggleChange) {
      properties[name] = event.checked;
    } else if (event instanceof InputEvent) {
      properties[name] = (event.target as HTMLInputElement).value;
    }
    context.notifyPropertiesChanged();
  }

  public removeBranch(
    branches: Branches,
    index: number,
    event: Event,
    context: StepEditorContext
  ) {
    console.log('removeBranch', branches, index);
    this.deleteBranchAtIndex(branches, index);
    console.log('branches', branches);
    context.notifyChildrenChanged();
  }

  public deleteBranchAtIndex<T>(obj: Record<string, T[]>, index: number): void {
    const keys = Object.keys(obj);
    if (index < 0 || index >= keys.length) return;

    const keyToDelete = keys[index];
    delete obj[keyToDelete];
  }

  public renameBranchAtIndex<T>(
    obj: Record<string, T[]>,
    oldKey: string,
    newKey: string,
    context: StepEditorContext
  ): void {
    if (!Object.prototype.hasOwnProperty.call(obj, oldKey) || oldKey === newKey)
      return;

    if (Object.prototype.hasOwnProperty.call(obj, newKey)) {
      throw new Error(`Key "${newKey}" already exists.`);
    }

    obj[newKey] = obj[oldKey];
    delete obj[oldKey];

    context.notifyChildrenChanged();
  }

  public addBranch(branches: Branches, context: StepEditorContext) {
    const index = Object.keys(branches || {}).length + 1;
    branches['New Branch ' + index] = [];
    context.notifyChildrenChanged();
  }

  public getChoicesForProperty(stepType: string, key: string): string[] | null {
    if (!this.definitionModel) return null;

    console.log('getChoicesForProperty', stepType, key);
    const stepDef = this.definitionModel.steps[stepType];
    if (!stepDef?.properties) return null;
    const propDef = stepDef.properties.find(
      (p) => p.path.parts[p.path.parts.length - 1] === key
    );
    if (!propDef || !propDef.value || !propDef.value.configuration) return null;
    return (propDef?.value?.configuration as ChoiceValueModelConfiguration)
      .choices;
  }

  stepTypeMap: Record<string, Record<string, string>> = {
    e164phone: isoAlpha2Map,
    dateCompare: operatorMap,
    iso3166: iso3166Map,
    dateFormat: DateFormatMap,
  };

  public getChoiceLabel(stepType: string, choice: string): string {
    const lookup = this.stepTypeMap[stepType];
    return lookup?.[choice.toUpperCase()] ?? choice;
  }

  public branchingEnabled(step: Step): boolean {
    if (
      isConcatStep(step) ||
      isStaticStep(step) ||
      isConditionalStep(step) ||
      isFirstValidStep(step)
    ) {
      return true;
    } else {
      return false;
    }
  }

  public onSourceNameChanged(
    properties: Properties,
    name: string,
    sourceName: Event | MatSlideToggleChange,
    context: RootEditorContext | StepEditorContext
  ) {
    console.log('onSourceNameChanged', properties, name, sourceName);
    if ('notifyChildrenChanged' in context && 'notifyNameChanged' in context) {
      this.loadAccountAttributes(context, sourceName as unknown as string);
    }
  }

  private accountAttributesCache = new Map<string, any[]>();
  private loadingStates = new Map<string, boolean>();

  private async loadAccountAttributes(
    editor: StepEditorContext,
    sourceName: string
  ): Promise<void> {
    return this.loadAccountAttributesForSource(sourceName);
  }

  // Updated method to get account attributes for display with auto-loading
  getAccountAttributes(editor: any): any[] {
    const sourceName = editor.step.properties['sourceName'];
    if (!sourceName) {
      return [];
    }

    const cacheKey = `${sourceName}`;
    console.log('getAccountAttributes', sourceName, cacheKey);

    // Check if we have cached data
    if (this.accountAttributesCache.has(cacheKey)) {
      console.log(
        'Account attributes cache:',
        this.accountAttributesCache.get(cacheKey)
      );
      return this.accountAttributesCache.get(cacheKey) || [];
    }

    // If not cached and not currently loading, start loading
    if (!this.loadingStates.get(cacheKey)) {
      console.log('Cache miss - loading account attributes for:', sourceName);
      // Don't await this - let it load in the background
      this.loadAccountAttributesForSource(sourceName).catch((error) => {
        console.error('Failed to load account attributes:', error);
      });
    }

    // Return empty array while loading
    return [];
  }

  // Add this simplified loading method that doesn't require editor context
  private async loadAccountAttributesForSource(
    sourceName: string
  ): Promise<void> {
    if (!sourceName) {
      return;
    }

    const cacheKey = `${sourceName}`;

    // Check if we already have cached data (double-check)
    if (this.accountAttributesCache.has(cacheKey)) {
      return;
    }

    // Set loading state
    this.loadingStates.set(cacheKey, true);

    const sourceId = this.sourceMap.get(sourceName);
    if (typeof sourceId === 'string') {
      try {
        const response = await this.sdk.getSourceSchemas({ sourceId });
        const schemas = response.data;

        const userSchema = schemas.find(
          (schema) =>
            schema.nativeObjectType === 'User' ||
            schema.nativeObjectType === 'account'
        );
        const attributes = userSchema
          ? userSchema.attributes?.map((value) => value.name)
          : [];

        console.log(
          'Loaded account attributes for source:',
          sourceName,
          attributes
        );

        this.accountAttributesCache.set(cacheKey, attributes ?? []);
        this.loadingStates.set(cacheKey, false);

        // Trigger change detection to update the UI
        setTimeout(() => {
          // This ensures Angular picks up the changes
        }, 0);
      } catch (error) {
        console.error('Error loading account attributes:', error);
        this.loadingStates.set(cacheKey, false);
      }
    } else {
      this.loadingStates.set(cacheKey, false);
    }
  }

  isAccountAttributeDisabled(editor: any): boolean {
    const sourceName = editor.step.properties['sourceName'];
    return !sourceName || this.isLoadingAccountAttributes(editor);
  }

  isLoadingAccountAttributes(editor: any): boolean {
    const sourceName = editor.step.properties['sourceName'];
    if (!sourceName) {
      return false;
    }

    const cacheKey = `${sourceName}`;
    return this.loadingStates.get(cacheKey) || false;
  }

  // Optional: Method to clear cache when needed
  clearAccountAttributesCache(): void {
    this.accountAttributesCache.clear();
    this.loadingStates.clear();
  }

  showBranch(step: Step, branchName: string): boolean {
    if (branchName === 'input') {
      return false;
    } else if (
      isConditionalStep(step) &&
      (branchName === 'positiveCondition' || branchName === 'negativeCondition')
    ) {
      return false;
    } else if (
      isDateCompareStep(step) &&
      (branchName === 'positiveCondition' ||
        branchName === 'negativeCondition' ||
        branchName === 'firstDate' ||
        branchName === 'secondDate')
    ) {
      return false;
    }
    return true;
  }

  isRequired(stepName: string, key: string): boolean {
    if (!this.definitionModel) return false;

    const stepDef = this.definitionModel.steps[stepName];
    if (!stepDef?.properties) return false;
    const propDef = stepDef.properties.find(
      (p) => p.path.parts[p.path.parts.length - 1] === key
    );
    if (!propDef) return false;
    const config = propDef.value?.configuration;
    if (!config) return false;

    // NullableVariableValueModelConfiguration
    if ('isRequired' in config && typeof config.isRequired === 'boolean') {
      return config.isRequired;
    }

    // StringValueModelConfiguration
    if ('minLength' in config && typeof config.minLength === 'number') {
      return config.minLength >= 1;
    }

    if ('choices' in config && Array.isArray(config.choices)) {
      return config.choices.length > 1;
    }

    // const stepDef = this.definitionModel.steps[stepName];
    // console.log('stepDef', stepDef);

    return false;
  }

  openMessageDialog(errorMessage: string, title: string): void {
    this.dialog.open(GenericDialogComponent, {
      data: {
        title: title,
        message: errorMessage,
      },
    });
  }

  public downloadTransform(): void {
    if (!this.definition?.sequence?.[0]) {
      this.snackBar.open('No transform to download', 'Close', {
        duration: 3000,
      });
      return;
    }

    try {
      let serializedTransform = serializeStep(this.definition.sequence[0]);

      let transformDownload: TransformReadV2025 =
        serializedTransform as TransformReadV2025;

      transformDownload.name = String(
        this.definition?.properties?.name ?? transformDownload.name
      );
      // Convert to JSON string with formatting
      const jsonContent = JSON.stringify(transformDownload, null, 2);

      // Create blob and download
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);

      // Create temporary download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `${transformDownload.name}.json`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.snackBar.open(`Downloaded ${transformDownload.name}.json`, 'Close', {
        duration: 3000,
      });
    } catch (error) {
      console.error('Download failed:', error);
      this.snackBar.open('Failed to download transform', 'Close', {
        duration: 3000,
      });
    }
  }

  // Add these methods to your TransformBuilderComponent class

  /**
   * Get example output for a date format pattern
   */
  public getDateFormatExample(pattern: string): string {
    // const examples: Record<string, string> = {
    //   'yyyy-MM-dd': '2024-03-15',
    //   'MM/dd/yyyy': '03/15/2024',
    //   'dd/MM/yyyy': '15/03/2024',
    //   'yyyy-MM-dd HH:mm:ss': '2024-03-15 14:30:45',
    //   'MMM dd, yyyy': 'Mar 15, 2024',
    //   'EEEE, MMMM dd, yyyy': 'Friday, March 15, 2024',
    //   'HH:mm:ss': '14:30:45',
    //   'yyyy-DDD': '2024-075',
    //   'yy/MM/dd': '24/03/15',
    //   'dd-MMM-yyyy': '15-Mar-2024',
    //   'MMMM yyyy': 'March 2024',
    //   'EEE, dd MMM yyyy': 'Fri, 15 Mar 2024',
    // };

    if (!pattern || pattern.trim() === '') {
      return 'Enter a pattern to see example';
    }

    return `Example: ${this.generateExampleFromPattern(pattern)}`;
  }

  /**
   * Generate a basic example from a custom pattern
   */
  private generateExampleFromPattern(pattern: string): string {
    try {
      // Simple pattern replacement for common elements
      let example = pattern
        .replace(/yyyy/g, '2024')
        .replace(/yy/g, '24')
        .replace(/MMMM/g, 'March')
        .replace(/MMM/g, 'Mar')
        .replace(/MM/g, '03')
        .replace(/M/g, '3')
        .replace(/dd/g, '15')
        .replace(/d/g, '15')
        .replace(/HH/g, '14')
        .replace(/H/g, '14')
        .replace(/hh/g, '02')
        .replace(/h/g, '2')
        .replace(/mm/g, '30')
        .replace(/m/g, '30')
        .replace(/ss/g, '45')
        .replace(/s/g, '45')
        .replace(/EEEE/g, 'Friday')
        .replace(/EEE/g, 'Fri')
        .replace(/EE/g, 'Fr')
        .replace(/E/g, 'F')
        .replace(/a/g, 'PM')
        .replace(/DDD/g, '075')
        .replace(/DD/g, '75')
        .replace(/D/g, '75');

      return example;
    } catch (error) {
      return '2024-03-15';
    }
  }

  /**
   * Validate a SimpleDateFormat pattern
   */
  public validateDateFormatPattern(pattern: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!pattern || pattern.trim() === '') {
      return { isValid: false, error: 'Pattern cannot be empty' };
    }

    // Basic validation for common SimpleDateFormat patterns
    const validPatterns = /^[yMdHhmsaEGwWDFkKzZSX\s\-\/\.\:\,\'\"]*$/;
    if (!validPatterns.test(pattern)) {
      return { isValid: false, error: 'Invalid characters in date pattern' };
    }

    // Check for balanced quotes
    const quoteCount = (pattern.match(/'/g) || []).length;
    if (quoteCount % 2 !== 0) {
      return { isValid: false, error: 'Unmatched quote in pattern' };
    }

    return { isValid: true };
  }

  /**
   * Enhanced property update for date format fields
   */
  public updateDateFormatProperty(
    properties: Properties,
    name: string,
    event: Event | MatSlideToggleChange,
    context: RootEditorContext | StepEditorContext
  ) {
    if (event instanceof MatSlideToggleChange) {
      properties[name] = event.checked;
    } else if (event instanceof Event) {
      const target = event.target as HTMLInputElement;
      const value = target.value;

      properties[name] = value;

      // Validate custom date format patterns
      if (
        (name === 'customInputFormat' || name === 'customOutputFormat') &&
        value
      ) {
        const validation = this.validateDateFormatPattern(value);
        if (!validation.isValid) {
          // You could show a validation error here
          console.warn(`Invalid date format pattern: ${validation.error}`);
        }
      }
    }

    context.notifyPropertiesChanged();
  }

  /**
   * Check if a date format step should show custom input field
   */
  public shouldShowCustomInput(step: any): boolean {
    return (
      step.type === 'dateFormat' && step.properties.inputFormat === 'CUSTOM'
    );
  }

  /**
   * Check if a date format step should show custom output field
   */
  public shouldShowCustomOutput(step: any): boolean {
    return (
      step.type === 'dateFormat' && step.properties.outputFormat === 'CUSTOM'
    );
  }

  /**
   * Get the effective input format (custom or selected)
   */
  public getEffectiveInputFormat(step: any): string {
    if (step.properties.inputFormat === 'CUSTOM') {
      return step.properties.customInputFormat || '';
    }
    return step.properties.inputFormat || '';
  }

  /**
   * Get the effective output format (custom or selected)
   */
  public getEffectiveOutputFormat(step: any): string {
    if (step.properties.outputFormat === 'CUSTOM') {
      return step.properties.customOutputFormat || '';
    }
    return step.properties.outputFormat || '';
  }

  // Add these methods to your TransformBuilderComponent class for Date Math support

  /**
   * Toggle between visual builder and manual expression input
   */
  public onDateMathBuilderToggle(
    properties: any,
    useBuilder: boolean,
    context: any
  ): void {
    properties.useBuilder = useBuilder;

    if (useBuilder) {
      // Parse existing expression into operations
      if (properties.expression) {
        const parsed = this.parseDateMathExpression(properties.expression);
        properties.baseDate = parsed.baseDate;
        properties.operations = parsed.operations;
      } else {
        // Initialize with defaults
        properties.baseDate = 'input';
        properties.operations = [];
      }
    } else {
      // Build expression from current operations
      this.updateDateMathExpression(properties, context);
    }

    context.notifyPropertiesChanged();
  }

  /**
   * Get operations array for the date math step
   */
  public getDateMathOperations(properties: any): any[] {
    if (!properties.operations) {
      properties.operations = [];
    }
    return properties.operations;
  }

  /**
   * Add a new operation to the date math step
   */
  public addDateMathOperation(properties: any, context: any): void {
    if (!properties.operations) {
      properties.operations = [];
    }

    properties.operations.push({
      operation: '+',
      value: 1,
      unit: 'd',
    });

    this.updateDateMathExpression(properties, context);
  }

  /**
   * Remove an operation from the date math step
   */
  public removeDateMathOperation(
    properties: any,
    index: number,
    context: any
  ): void {
    if (properties.operations && properties.operations.length > index) {
      properties.operations.splice(index, 1);
      this.updateDateMathExpression(properties, context);
    }
  }

  /**
   * Update a specific operation property
   */
  public updateDateMathOperationAt(
    properties: any,
    index: number,
    field: string,
    value: any,
    context: any
  ): void {
    if (!properties.operations || !properties.operations[index]) {
      return;
    }

    const operation = properties.operations[index];

    if (field === 'value' && value instanceof Event) {
      const target = value.target as HTMLInputElement;
      operation[field] = parseInt(target.value, 10) || 1;
    } else {
      operation[field] = value;
    }

    // If operation is changed to '/', set value to 1 (rounding doesn't need a value)
    if (field === 'operation' && value === '/') {
      operation.value = 1;
    }

    this.updateDateMathExpression(properties, context);
  }

  /**
   * Update the expression based on current builder state
   */
  public updateDateMathExpression(properties: any, context: any): void {
    if (!properties.useBuilder) {
      context.notifyPropertiesChanged();
      return;
    }

    let expression = properties.baseDate === 'now' ? 'now' : '';

    if (properties.operations && properties.operations.length > 0) {
      for (const op of properties.operations) {
        if (op.operation === '/') {
          expression += `/${op.unit}`;
        } else {
          expression += `${op.operation}${op.value || 1}${op.unit}`;
        }
      }
    }

    properties.expression =
      expression || (properties.baseDate === 'now' ? 'now' : '');
    context.notifyPropertiesChanged();
  }

  /**
   * Get the generated expression for display
   */
  public getGeneratedExpression(properties: any): string {
    if (!properties.useBuilder) {
      return properties.expression || '';
    }

    let expression = properties.baseDate === 'now' ? 'now' : '';

    if (properties.operations && properties.operations.length > 0) {
      for (const op of properties.operations) {
        if (op.operation === '/') {
          expression += `/${op.unit}`;
        } else {
          expression += `${op.operation}${op.value || 1}${op.unit}`;
        }
      }
    }

    return (
      expression || (properties.baseDate === 'now' ? 'now' : '(no operations)')
    );
  }

  /**
   * Get a human-readable description of the expression
   */
  public getExpressionDescription(properties: any): string {
    if (
      !properties.useBuilder ||
      !properties.operations ||
      properties.operations.length === 0
    ) {
      if (properties.baseDate === 'now') {
        return 'Returns the current date and time';
      }
      return 'Returns the input date unchanged';
    }

    const baseDescription =
      properties.baseDate === 'now'
        ? 'Starting from current date/time'
        : 'Starting from input date';

    const operationDescriptions = properties.operations.map((op: any) => {
      const unitNames: Record<string, string> = {
        y: 'year(s)',
        M: 'month(s)',
        w: 'week(s)',
        d: 'day(s)',
        h: 'hour(s)',
        m: 'minute(s)',
        s: 'second(s)',
      };

      if (op.operation === '/') {
        return `round to ${unitNames[op.unit] || op.unit}`;
      } else if (op.operation === '+') {
        return `add ${op.value} ${unitNames[op.unit] || op.unit}`;
      } else {
        return `subtract ${op.value} ${unitNames[op.unit] || op.unit}`;
      }
    });

    return `${baseDescription}, then ${operationDescriptions.join(', ')}`;
  }

  /**
   * Parse an existing expression into base date and operations
   */
  public parseDateMathExpression(expression: string): {
    baseDate: 'input' | 'now';
    operations: any[];
  } {
    if (!expression) {
      return { baseDate: 'input', operations: [] };
    }

    const baseDate = expression.startsWith('now') ? 'now' : 'input';
    const operations: any[] = [];

    // Remove 'now' from beginning if present
    let remaining = expression.startsWith('now')
      ? expression.substring(3)
      : expression;

    // Parse operations using regex
    const operationRegex = /([+\-\/])(\d*)([yMwdhms])/g;
    let match;

    while ((match = operationRegex.exec(remaining)) !== null) {
      const [, operation, value, unit] = match;
      operations.push({
        operation: operation as '+' | '-' | '/',
        value: operation === '/' ? 1 : parseInt(value, 10) || 1,
        unit: unit as 'y' | 'M' | 'w' | 'd' | 'h' | 'm' | 's',
      });
    }

    return { baseDate, operations };
  }

  /**
   * Validate a date math expression
   */
  public validateDateMathExpression(expression: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!expression || expression.trim() === '') {
      return { isValid: false, error: 'Expression cannot be empty' };
    }

    // Basic validation
    const validPattern = /^(now)?([+\-\/]\d*[yMwdhms])*$/;
    if (!validPattern.test(expression)) {
      return { isValid: false, error: 'Invalid expression format' };
    }

    // Check for valid units
    const validUnits = ['y', 'M', 'w', 'd', 'h', 'm', 's'];
    const unitMatches = expression.match(/[yMwdhms]/g) || [];
    for (const unit of unitMatches) {
      if (!validUnits.includes(unit)) {
        return { isValid: false, error: `Invalid unit: ${unit}` };
      }
    }

    return { isValid: true };
  }

  /**
   * Get example expressions for date math
   */
  public getDateMathExamples(): { expression: string; description: string }[] {
    return [
      { expression: 'now', description: 'Current date and time' },
      { expression: 'now/h', description: 'Current time rounded to the hour' },
      { expression: 'now+1w', description: 'One week from now' },
      {
        expression: 'now+1y+1M+2d-4h+1m-3s/s',
        description: 'Complex calculation rounded to seconds',
      },
      { expression: '+3M', description: 'Add 3 months to input date' },
      { expression: '-1d', description: 'Subtract 1 day from input date' },
      { expression: '/d', description: 'Round input date to start of day' },
    ];
  }
}
