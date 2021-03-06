import { Component, OnInit, NgModule, SimpleChanges, OnChanges, ViewEncapsulation, ContentChild, forwardRef, Input, Output, EventEmitter, ElementRef, AfterViewInit, Pipe, PipeTransform } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor, NG_VALIDATORS, Validator, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ListItem, MyException } from './multiselect.model';
import { DropdownSettings } from './multiselect.interface';
import { OutsideClickDirective } from './outsideClick';
import { ListFilterPipe } from './list-filter';
import { Item, TemplateRenderer } from './menu-item';

export const DROPDOWN_CONTROL_VALUE_ACCESSOR: any = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => NGXCustomMultiSelect),
    multi: true
};
export const DROPDOWN_CONTROL_VALIDATION: any = {
    provide: NG_VALIDATORS,
    useExisting: forwardRef(() => NGXCustomMultiSelect),
    multi: true,
}
const noop = () => {
};

@Component({
    selector: 'ngx-multiselect',
    templateUrl: './multiselect.component.html',
    host: { '[class]': 'defaultSettings.classes' },
    styleUrls: ['./multiselect.component.scss'],
    providers: [DROPDOWN_CONTROL_VALUE_ACCESSOR, DROPDOWN_CONTROL_VALIDATION]
})

export class NGXCustomMultiSelect implements OnInit, ControlValueAccessor, OnChanges, Validator {

    @Input()
    data: Array<ListItem>;

    @Input()
    settings: DropdownSettings;

    @Output('onSelect')
    onSelect: EventEmitter<ListItem> = new EventEmitter<ListItem>();

    @Output('onDeSelect')
    onDeSelect: EventEmitter<ListItem> = new EventEmitter<ListItem>();

    @Output('onSelectAll')
    onSelectAll: EventEmitter<Array<ListItem>> = new EventEmitter<Array<ListItem>>();

    @Output('onDeSelectAll')
    onDeSelectAll: EventEmitter<Array<ListItem>> = new EventEmitter<Array<ListItem>>();

    @ContentChild(Item) itemTempl: Item;

    public selectedItems: Array<ListItem>;
    public isActive: boolean = false;
    public isSelectAll: boolean = false;
    public groupedData: Array<ListItem>;
    filter: ListItem = new ListItem();
    defaultSettings: DropdownSettings = {
        singleSelection: false,
        text: 'Select',
        enableCheckAll: true,
        nameProperty: 'nameDisplay',
        selectAllText: 'Select All',
        unSelectAllText: 'UnSelect All',
        enableSearchFilter: false,
        extraFilterById: false,
        maxHeight: 300,
        badgeShowLimit: 999999999999,
        classes: '',
        disabled: false,
        searchPlaceholderText: 'Search',
        showCheckbox: true
    };
    public parseError: boolean;
    constructor() {

    }
    ngOnInit() {
        this.settings = Object.assign(this.defaultSettings, this.settings);
        if (this.settings.groupBy) {
            this.groupedData = this.transformData(this.data, this.settings.groupBy);
        }
    }
    ngOnChanges(changes: SimpleChanges) {
        if(changes.data && !changes.data.firstChange) {
            if (this.settings.groupBy) {
                this.groupedData = this.transformData(this.data, this.settings.groupBy);
                if (this.data.length == 0) {
                    this.selectedItems = [];
                }
            }
        }
    }
    ngDoCheck() {
        if (this.selectedItems) {
            if (this.selectedItems.length == 0 || this.data.length == 0 || this.selectedItems.length < this.data.length) {
                this.isSelectAll = false;
            }
        }
    }
    onItemClick(item: ListItem, index: number, evt: Event) {
        if (this.settings.disabled) {
            return false;
        }

        let found = this.isSelected(item);
        let limit = this.selectedItems.length < this.settings.limitSelection ? true : false;

        if (!found) {
            if (this.settings.limitSelection) {
                if (limit) {
                    this.addSelected(item);
                    this.onSelect.emit(item);
                }
            }
            else {
                this.addSelected(item);
                this.onSelect.emit(item);
            }

        }
        else {
            this.removeSelected(item);
            this.onDeSelect.emit(item);
        }
        if (this.isSelectAll || this.data.length > this.selectedItems.length) {
            this.isSelectAll = false;
        }
        if (this.data.length == this.selectedItems.length) {
            this.isSelectAll = true;
        }
    }
    public validate(c: FormControl) {

        return (!this.parseError) ? null : {
            jsonParseError: {
                valid: false,
            },
        };
    }
    private onTouchedCallback: (_: any) => void = noop;
    private onChangeCallback: (_: any) => void = noop;

    writeValue(value: any) {
        if (value !== undefined && value !== null) {
            if (this.settings.singleSelection) {
                try {

                    if (value.length > 1) {
                        this.selectedItems = [value[0]];
                        throw new MyException(404, { "msg": "Single Selection Mode, Selected Items cannot have more than one item." });
                    }
                    else {
                        this.selectedItems = value;
                    }
                }
                catch (e) {
                    console.error(e.body.msg);
                }

            }
            else {
                if (this.settings.limitSelection) {
                    this.selectedItems = value.splice(0, this.settings.limitSelection);
                }
                else {
                    this.selectedItems = value;
                }
                if (this.selectedItems.length === this.data.length && this.data.length > 0) {
                    this.isSelectAll = true;
                }
            }
        } else {
            this.selectedItems = [];
        }
    }

    //From ControlValueAccessor interface
    registerOnChange(fn: any) {
        this.onChangeCallback = fn;
    }

    //From ControlValueAccessor interface
    registerOnTouched(fn: any) {
        this.onTouchedCallback = fn;
    }
    trackByFn(index: number, item: ListItem) {
        return item.id;
    }
    isSelected(clickedItem: ListItem) {
        let found = false;
        this.selectedItems && this.selectedItems.forEach(item => {
            if (clickedItem.id === item.id) {
                found = true;
            }
        });
        return found;
    }
    addSelected(item: ListItem) {
        if (this.settings.singleSelection) {
            this.selectedItems = [];
            this.selectedItems.push(item);
        }
        else
            this.selectedItems.push(item);
        if (this.selectedItems.length > 0) {
            this.parseError = false;
        }
        this.onChangeCallback(this.selectedItems);

    }
    removeSelected(clickedItem: ListItem) {
        this.selectedItems && this.selectedItems.forEach(item => {
            if (clickedItem.id === item.id) {
                this.selectedItems.splice(this.selectedItems.indexOf(item), 1);
            }
        });
        if (this.selectedItems.length == 0) {
            this.parseError = true;
        }
        this.onChangeCallback(this.selectedItems);
    }
    toggleDropdown(evt: any) {
        if (this.settings.disabled) {
            return false;
        }
        this.isActive = !this.isActive;
        evt.preventDefault();
    }
    closeDropdown() {
        this.filter = new ListItem();
        this.isActive = false;
    }
    toggleSelectAll() {
        if (!this.isSelectAll) {
            this.selectedItems = [];
            this.selectedItems = this.data.slice();
            this.isSelectAll = true;
            this.onChangeCallback(this.selectedItems);
            this.onSelectAll.emit(this.selectedItems);
        }
        else {
            this.selectedItems = [];
            this.isSelectAll = false;
            this.onChangeCallback(this.selectedItems);
            this.onDeSelectAll.emit(this.selectedItems);
        }
    }
    transformData(arr: Array<ListItem>, field: any): Array<ListItem> {
        const groupedObj: any = arr.reduce((prev: any, cur: any) => {
            if (!prev[cur[field]]) {
                prev[cur[field]] = [cur];
            } else {
                prev[cur[field]].push(cur);
            }
            return prev;
        }, {});
        const tempArr: any = [];
        Object.keys(groupedObj).map(function (x) {
            tempArr.push({ key: x, value: groupedObj[x] });
        });

        tempArr.sort((a: any, b: any) => {
          if (a.key.toUpperCase() < b.key.toUpperCase()) { return -1 };
          if (a.key.toUpperCase() > b.key.toUpperCase()) { return 1 };
          return 0;
        });

        return tempArr;
    }

    clearFilter(event: Event) {
      event.stopPropagation();
      this.filter = new ListItem();
      return true;
    }
}

@NgModule({
    imports: [CommonModule, FormsModule],
    declarations: [NGXCustomMultiSelect, OutsideClickDirective, ListFilterPipe, Item, TemplateRenderer],
    exports: [NGXCustomMultiSelect, OutsideClickDirective, ListFilterPipe, Item, TemplateRenderer]
})
export class NGXCustomMultiSelectModule { }
