
declare function require(s:string):any
var _ =require("underscore")
import diff = require("./diff");
import tm = require("./treeModel");
    
//import Atom =require("atom")
export type HTMLTypes =  HTMLElement;

    
enum Position { 
    Before, 
    After 
};

export interface IDisposable {

    dispose();
}

export class CompositeDisposable implements IDisposable {

    private items: IDisposable[] = []

    add(d: IDisposable) {
        this.items.push(d);
    }
    remove(d: IDisposable) {
        this.items = this.items.filter(x=> x != d);
    }

    dispose() {
        this.items.forEach(x=> x.dispose())
    }
}


/*
 * Describest an Component interface for UI
 */
export interface UIComponent extends IDisposable {
    
    renderUI()                                  : HTMLTypes;
    
    parent()                                    : UIComponent|BasicComponent<any>;
    setParent(p: UIComponent)                   : void;
    
    children()                                  : UIComponent[];    
    addChild(ch: UIComponent)                   : void;
    removeChild(ch: UIComponent)                : void;
    
    isAttached()                                : boolean;
    ui()                                        : HTMLTypes;
    
    caption()                                   : string;
    
    changed()                                   : void; 
    
    refresh()                                   : void;
}

export interface IListenable<T> {
    addListener(listener: T);
    removeListener(listener: T);
}

export interface Function<T, R> {
    (x: T) : R
}

export interface AnyFunc<T> extends Function<T, any> {}

export enum StatusCode {
    OK,
    WARNING,
    ERROR
}

export interface Status {
    code: StatusCode;
    message: string;
}

export interface Validator<T> extends Function<T, Status> {}

export type StatusListener = AnyFunc<Status>


export interface IBinding extends IListenable<IBindingListener> {
    get(): any;

    set(v: any): any;

    addValidator(v: Validator<any>)
    removeValidator(v: Validator<any>);
    addStatusListener(s: StatusListener);
    removeStatusListener(s: StatusListener);

    status(): Status
    setStatus?(s:Status)
}

export interface IBindingListener {
    (newValue: any, oldValue?: any, b?: IBinding)
}

export class BasicBinding implements IBinding {

    private listeners: IBindingListener[] = [];
    private validators: Validator<any>[] = [];
    private slisteners: StatusListener[] = [];

    private _status: Status;
    
    addValidator(v: Validator<any>) {
        this.validators.push(v);
    }
    removeValidator(v: Validator<any>) {
        this.validators = this.validators.filter(x=> x != v)
    }
    
    addStatusListener(s: StatusListener) {
        this.slisteners.push(s);
    }
    removeStatusListener(s: StatusListener) {
        this.slisteners = this.slisteners.filter(x=> x != s);
    }

    status(): Status {
        return this._status;
    }
    
    public setStatus(newStatus: Status) {
        if (this._status != newStatus) {
            this.slisteners.forEach(listener=> listener(newStatus))
        }
        this._status = newStatus;
    }

    get(): any {
        return this.value;
    }

    constructor(private value: any = null) {}

    set(v: any): any {
        if (this.value != v) {
            var oldValue = this.value;
            this.value = v;
            var ns = { code: StatusCode.OK, message: "" }
            this.validators.forEach(x=> {
                var s = x(v);
                if (s.code > ns.code)
                    ns = s;
            });
            
            this.setStatus(ns);
            this.listeners.forEach(listener=> listener(v, oldValue, this));
        }
        return oldValue;
    }

    addListener(listener: IBindingListener) {
        this.listeners.push(listener);
    }

    removeListener(listener: IBindingListener) {
        this.listeners = this.listeners.filter(x=> x != listener)
    }
}

export class BasicComponent<T extends HTMLElement> implements UIComponent, IDisposable {
    
    // ID: get, set
    private _id: string;
    id(): string {
        return this._id;
    }
    
    setId(id: string) {
        this._id = id;
        return this;
    }

    // Disabled
    private _disabled : boolean = false;
    disabled() { return this._disabled; }
    setDisabled(disabled: boolean)  { this._disabled = disabled; this.handleLocalChange(); }
    // End Disabled


    private _parent: UIComponent;
    
    protected _children: UIComponent[] = [];
    protected focusListeners: EventHandler[] = [];
    protected _onAltClickListeners: EventHandler[] = [];
    protected _onKeyUpListeners: EventHandler[] = [];
    protected _onKeyDownListeners: EventHandler[] = [];
    protected _onKeyPressListeners: EventHandler[] = [];
    
    protected _bListener: IBindingListener = x=> {
        if (!this.inSet) {
            this.handleDataChanged()
        }
    }
    
    setTabIndex(index: number) { 
        this.ui().tabIndex = index;
    }
    
    protected _binding: IBinding = this.createBinding();

    protected createBinding() {
        var b = new BasicBinding();
        b.addListener(this._bListener)
        return b;
    }
    
    protected _extraClasses: string[] = []
    private _icon: Icon;
    private _percentWidth: number;
    private _percentHeight: number;

    private _extraStyles: { [name: string]: string } = {};

    padding_right: number;
    padding_left: number;

    margin_right: number;
    margin_left: number;

    margin_top: number;
    margin_bottom: number;

    addFocusListener(e: EventHandler) {
        this.focusListeners.push(e);
    }
    
    removeFocusListener(e: EventHandler) {
        this.focusListeners = this.focusListeners.filter(x=> x != e)
    }

    addAltClickListener(e: EventHandler) {
        this._onAltClickListeners.push(e);
    }
    
    removeAltClickListener(e: EventHandler) {
        this._onAltClickListeners = this._onAltClickListeners.filter(x=> x != e)
    }

    addKeyDownListener(e: EventHandler) {
        this._onKeyDownListeners.push(e);
    }
    
    removeKeyDownListener(e: EventHandler) {
        this._onKeyDownListeners = this._onKeyDownListeners.filter(x=> x != e)
    }
    addKeyUpListener(e: EventHandler) {
        this._onKeyUpListeners.push(e);
    }
    
    removeKeyUpListener(e: EventHandler) {
        this._onKeyUpListeners = this._onKeyUpListeners.filter(x=> x != e)
    }
    addKeyPressListener(e: EventHandler) {
        this._onKeyPressListeners.push(e);
    }
    
    removeKeyPressListener(e: EventHandler) {
        this._onKeyPressListeners = this._onKeyPressListeners.filter(x=> x != e)
    }
    
    pad(left: number, right: number): BasicComponent<T> {
        this.padding_left = left;
        this.padding_right = right;
        return this;
    }
    
    margin(left: number, right: number, top: number = null, bottom: number = null): BasicComponent<T> {
        this.margin_left = left;
        this.margin_right = right;
        this.margin_bottom = bottom;
        this.margin_top = top;
        return this;
    }

    protected getAssociatedValue() {
        if (this._binding) {
            return this._binding.get();
        }
        return null;
    }
    
    private inSet: boolean = false;

    protected setAssociatedValue(v: any) {
        this.inSet = true;
        try {
            this._binding.set(v);
        } finally {
            this.inSet = false;
        }
    }

    getStyle() {
        return this._extraStyles;
    }
    
    private _caption: string

    caption(): string {
        return this._caption;
    }
    
    setCaption(s: string): BasicComponent<T> {
        this._caption = s;
        this.handleLocalChange();
        return this;
    }

    setIcon(icon: Icon) {
        this._icon = icon;
        this.handleLocalChange();
    }

    getIcon(): Icon {
        return this._icon
    }
    
    setStyle(s: string, value: string): BasicComponent<T> {
        this._extraStyles[s] = value;
        this.handleLocalChange();
        return this;
    }
    
    removeStyle(s: string) {
        delete this._extraStyles[s]
    }
    
    hasClass(className: string): boolean {
        return this._extraClasses.indexOf(className) != -1
    }
    
    disposable: CompositeDisposable = new CompositeDisposable()

    tooltipHandle: IDisposable;

    clearUI(){
        this._ui=null;
    }

    private applyTooltip(tooltip: BasicComponent<any>) {
        var tooltipText = hc(tooltip).renderUI().innerHTML;
        var outer = this;
        this.tooltipComponentListener = {

            changed: function(b: BasicComponent<any>) {
                outer.disposable.remove(outer.tooltipHandle)
                outer.tooltipHandle.dispose();
                if (outer.tooltipComponent) {
                    outer.applyTooltip(outer.tooltipComponent)
                }
            }
        }
        tooltip.addComponentListener(this.tooltipComponentListener)
        var tooltipv = atom.tooltips.add(this.ui(), {
            //TODO SEPARATE STYLE
            title: '<div class="raml-console-tooltip">' + tooltipText + '</div>',
            delay: 100,
            html: true

        })
        this.tooltipHandle = tooltipv;
        this.disposable.add(tooltipv)
    }

    tooltipComponent: BasicComponent<any>
    tooltipComponentListener: ElementChangeListener;


    protected handleDataChanged() {}

    setTooltip(t: BasicComponent<any>): BasicComponent<T> {
        return null;
        // this.disposeTooltipListeners();
        // this.tooltipComponent = t;
        // this.handleLocalChange();
        // return this;
    }

    private disposeTooltipListeners() {
        if (this.tooltipComponent && this.tooltipComponentListener) {
            this.tooltipComponent.removeComponentListener(this.tooltipComponentListener);
            this.tooltipComponentListener = null;
            this.tooltipHandle.dispose();
            this.disposable.remove(this.tooltipHandle)
        }
    }


    /**
     * may be called multiple times
     */
    dispose() {
        this.disposable.dispose();
        this._children.forEach(x=>{x.dispose()})

        if (this._ui){
            this._ui.onfocus =null;
            this._ui.onclick=null;
            (<Node>this._ui).removeEventListener("DOMNodeRemovedFromDocument", this.destroyListener);
            this._ui=null;

        }
        this._parent=null;
        this.wasDisposed=true;


    }
    wasDisposed=false;

    public getPercentWidth(): number {
        return this._percentWidth;
    }

    public setPercentWidth(value: number): BasicComponent<T> {
        this._percentWidth = value;
        this.handleLocalChange();
        return this;
    }

    public getPercentHeight(): number {
        return this._percentHeight;
    }

    public setPercentHeight(value: number): BasicComponent<T> {
        this._percentHeight = value;
        this.handleLocalChange();
        return this;
    }

    private _display: boolean = true;

    setDisplay(display: boolean) {
        this._display = display;
        this.handleLocalChange();
    }
    
    getDisplay() {
        return this._display;
    }

    private _onClickListeners: EventHandler[] = [];

    addClass(token: string) {
        this._extraClasses.push(token);
        if (this._ui) {
            this._ui.classList.add(token);
        }
        return this;
    }
    
    removeClass(token: string) {
        this._extraClasses = this._extraClasses.filter(x=> x != token);
        if (this._ui) {
            this._ui.classList.remove(token);
        }
    }

    addOnClickListener(ev: EventHandler) {
        this._onClickListeners.push(ev);
        this.handleLocalChange();
    }
    removeOnClickListener(ev: EventHandler) {
        this._onClickListeners = this._onClickListeners.filter(x=> x != ev);
        this.handleLocalChange();
    }
     
     
    protected _ui: T; 
    ui() {
        if (this._ui == null) this._ui = this.renderUI();
        return this._ui;
    }
    
    refresh() : void  {
        var ui = this.renderUI();
        if (this._ui != null && this._ui.parentNode != null)
            this._ui.parentNode.replaceChild(ui, this._ui);
                  
        
        this._ui = ui;
    }

    constructor(private _tagName, icon: Icon = null) {
        this._icon = icon;
    }
    
    setTagName(s: string) {
        this._tagName = s;
    }

    setBinding(b: IBinding) {
        this._binding = b;
        b.addListener(this._bListener);
        this.handleDataChanged();
    }

    getBinding(): IBinding {
        return this._binding;
    }

    private firstInit: boolean = false;

    protected selfInit() {}

    renderUI(): T {

        var start = this.selfRender();
        this._ui = start;
        if (!this.firstInit) {
            this.selfInit();
            this.firstInit = true;
        }
        
        this.customize(start);
        
        this._children.filter(x=>x!=null).forEach(child=>start.appendChild(child.ui()));
        
        var footer = this.selfRenderFooter();
        if (footer) {
            start.appendChild(footer);
        }
        return start;
    }
    
    private _oldIcon: string;

    focusPropagator= x=> {
        this.focusListeners.forEach(y=> y(this))
    }

    destroyListener=x=> {
        //x.stopPropagation();

        if (x.srcElement == this._ui&&this.dispose) {
            this.dispose()
        }
        x.srcElement.onfocus =null;
        x.srcElement.onclick=null;
        (<Node>x.srcElement).removeEventListener("DOMNodeRemovedFromDocument", this.destroyListener);
    };
    
    protected customize(element: T) {
        if (this._icon) {
            if (element.classList.contains("icon")) {
                element.classList.remove(this._oldIcon)
            }
            else {
                element.classList.add("icon")
            }
            var v = iconToClass(this._icon);
            this._oldIcon = v;
            element.classList.add(v)
        }

        else {
            if (element.classList.contains("icon")) {
                element.classList.remove(this._oldIcon)
            }
        }
        element.onfocus =this.focusPropagator;
        (<Node>element).addEventListener("DOMNodeRemovedFromDocument", this.destroyListener);
        //TODO  HANDLE LYFECICLE

        if (this.tooltipComponent) {
            this.applyTooltip(this.tooltipComponent)
        }

        if (this._onClickListeners.length > 0 || this._onAltClickListeners.length > 0) {
            element.onclick = event=> {
                if (!this.disabled()) {
                    var listeners;

                    if (event.altKey) {
                        listeners = this._onAltClickListeners;
                    } else {
                        listeners = this._onClickListeners;
                    }

                    listeners.forEach(listener=> listener(this));

                    event.stopPropagation()
                }
            }
        } else {
            element.onclick = null;
        }
        if (this._onKeyDownListeners.length > 0) {
            element.onkeydown = event=> {
                this._onKeyDownListeners.forEach(listener => listener(this, event));
            }
        }
        if (this._onKeyUpListeners.length > 0) {
            element.onkeydown = event=> {
                this._onKeyUpListeners.forEach(listener => listener(this, event));
            }
        }
        if (this._onKeyPressListeners.length > 0) {
            element.onkeydown = event=> {
                this._onKeyPressListeners.forEach(listener => listener(this, event));
            }
        }
        
        var styleString = "";
        if (this._percentWidth) {
            styleString += "width:" + this._percentWidth + "%;"
        }
        if (this._percentHeight) {
            styleString += "width:" + this._percentHeight + "%;"
        }
        if (this._extraStyles) {
            for (var k in this._extraStyles) {
                styleString += k + ":" + this._extraStyles[k] + (";");

            }
        }
        if (this.disabled()) {
            styleString += "color: gray;text-decoration:none;"//FIXME
        }
        if (this.padding_left) {
            styleString += "padding-left:" + this.padding_left + "px;"
        }
        if (this.padding_right) {
            styleString += "padding-right:" + this.padding_right + "px;"
        }
        if (this.margin_left) {
            styleString += "margin-left:" + this.margin_left + "px;"
        }
        if (this.margin_right) {
            styleString += "margin-right:" + this.margin_right + "px;"
        }

        if (this.margin_bottom) {
            styleString += "margin-bottom:" + this.margin_bottom + "px;"
        }
        if (this.margin_right) {
            styleString += "margin-top:" + this.margin_top + "px;"
        }
        if (this._display == false) {
            styleString += "display:none"
        }
        element.setAttribute("style", styleString);
        this._extraClasses.forEach(x=> element.classList.add(x));
        //element.onfocus
    }

    /**
     *
     * @returns not null element;
     */
    protected selfRender(): T {
        return <any>document.createElement(this._tagName);
    }

    protected selfRenderFooter(): HTMLElement {
        return null;
    }

    parent(): UIComponent {
        return this._parent;
    }

    setParent(p: UIComponent) : void {
        if (this._parent != null)
            this._parent.removeChild(this);
        
        this._parent = p;
    }


    clear() {
        for (var i = 0; i < this._children.length; i++)
            try {
                this._ui.removeChild(this._children[i].ui());
            } catch (e) {}
        this._children = [];
    }

    addChild(child: UIComponent, before: UIComponent = null, after?: boolean) {
        if (child == null) return;
        
        var ui = this.ui();
        
        child.setParent(this);
        
        if (before == null) {
            if (after == true || after == undefined) {
                ui.appendChild(child.ui());
                this._children.push(child);    
            } else {
                ui.insertBefore(child.ui(), ui.firstChild );
                this._children.splice(0, 0, child);
            }
             
        } else {
            var bui = before.ui();
            ui.insertBefore(child.ui(), after ? bui.nextElementSibling : bui );
            this._children.splice(this._children.indexOf(before), 0, child);
        }

        this.changed();
    }
    
    removeChild(child: UIComponent) {
        //child.dispose();
        this._children = this._children.filter(x=> x != child);
        if (this._ui) {
            try {
                this._ui.removeChild(child.ui())
            } catch (e) { }
        }
        
        this.changed();
    }
    
    replaceChild(newChild: UIComponent, oldChild: UIComponent) {
        this.addChild(newChild, oldChild);
        this.removeChild(oldChild);
    }
    
    componentListeners: ElementChangeListener[];

    addComponentListener(cl: ElementChangeListener) {
        if (!this.componentListeners) {
            this.componentListeners = [];
        }
        this.componentListeners.push(cl);
    }
    
    removeComponentListener(cl: ElementChangeListener) {
        if (this.componentListeners) {
            this.componentListeners = this.componentListeners.filter(x=> x != cl);
        }
    }

    protected handleLocalChange() {
        if (this.componentListeners) {
            this.componentListeners.forEach(x=> x.changed(this));
        }
        if (this._ui) {
            this.customize(this._ui);
        }
    }

    changed(): void {
        if (this._parent) {
            this._parent.changed();
        }
    }


    children(): UIComponent[] {
        return [].concat(this._children);
    }

    isAttached(): boolean {
        if (this._parent) {
            return this._parent.isAttached();
        }
        return false;
    }
}


export interface ElementChangeListener {
    changed(element: BasicComponent<any>);
}

export class CheckBox extends BasicComponent<HTMLDivElement> implements IField<HTMLDivElement> {
    
    getActualField(): CheckBox {
        return this;
    }

    setLabelWidth(w: number) {}
    setLabelHeight(h: number) { this.getActualField().setStyle("line-height", h + "px"); }

    private _required: boolean = false;

    setRequired(b: boolean) {
        this._required = b;
    }

    private value: boolean = false;

    protected handleDataChanged() {
        this.setValue(this.getBinding().get());
        return super.handleDataChanged();
    }

    protected selfInit() {
        var element = this.ui();
        element.classList.add("checkbox");
        element.classList.add("settings-view");
        element.classList.add("pane-item");
        var cl: HTMLInputElement = document.createElement("input")

        cl.type = "checkbox";
        this.actualInput = cl;
        cl.checked = this.value;
        cl.onchange = x=> { var value = this.getValue(); this.setAssociatedValue(value); this._onchange(this, value) };
        var id = "check" + (CheckBox.num++);
        cl.id = id;
        var label: HTMLLabelElement = document.createElement("label")
        label.htmlFor = id;
        element.appendChild(label)
        label.appendChild(cl);
        var title = document.createElement("div")
        title.classList.add("setting-title");
        title.setAttribute("style", "display:inline;")
        title.textContent = this.caption();
        label.appendChild(title);
        var description = document.createElement("div")
        description.classList.add("setting-description");
        //description.textContent="some description";
        element.appendChild(description);
    }

    static num = 0;

    constructor(caption: string, icon: Icon, private _onchange: EventHandler) {
        super("div", icon);
        this.setCaption(caption);
    }
    
    setValue(v: boolean) {
        if (this.actualInput) {
            this.actualInput.checked = v;
        }
        this.value = v;
    }

    getValue(): boolean {
        return this.actualInput.checked;
    }
    
    private actualInput: HTMLInputElement; // we need that because actual checkbox might be in span
    
    refresh() : void {
        this.actualInput.value = this.caption();
    }
}

export class RadioButton extends BasicComponent<HTMLDivElement> implements IField<HTMLDivElement> {
    
    getActualField(): RadioButton {
        return this;
    }

    setLabelWidth(w: number) {}
    setLabelHeight(h: number) {}

    private _required: boolean = false;

    setRequired(b: boolean) {
        this._required = b;
    }

    private value: boolean = false;

    protected handleDataChanged() {
        this.setValue(this.getBinding().get());
        return super.handleDataChanged();
    }

    protected selfInit() {
        var element = this.ui();
        element.classList.add("radio");
        element.classList.add("settings-view");
        element.classList.add("pane-item");
        var cl: HTMLInputElement = document.createElement("input")

        cl.type = "radio";
        this.actualInput = cl;
        cl.checked = this.value;
        cl.onchange = x=> { var v = this.getValue(); this.setAssociatedValue(v); this._onchange(this, v) };
        cl.name = this.id();
        var label: HTMLLabelElement = document.createElement("label")
        label.htmlFor = cl.id;
        element.appendChild(label);
        label.appendChild(cl);
        var title = document.createElement("div")
        title.classList.add("setting-title");
        title.setAttribute("style", "display:inline;")
        title.textContent = this.caption();
        label.appendChild(title);
        var description = document.createElement("div")
        description.classList.add("setting-description");
        element.appendChild(description);
    }

    id() { return this._rid; }
    setId(id: string) { this._rid = id; return this; }

    constructor(caption: string, private _rid: string, icon: Icon, private _onchange: EventHandler) {
        super("div", icon);
        this.setCaption(caption);
    }
    
    setValue(v: boolean) {
        if (this.actualInput) {
            this.actualInput.checked = v;
        }
        this.value = v;
    }

    getValue(): boolean {
        return this.actualInput.checked;
    }
    
    private actualInput: HTMLInputElement; // we need that because actual checkbox might be in span
    
    refresh() : void {
        this.actualInput.value = this.caption();
    }
}

export class Select extends BasicComponent<HTMLDivElement>{

    private _select: HTMLSelectElement
    private _value: string;

    private _options: string[] = [];

    getOptions(): string[] {
        return this._options;
    }
    
    setOptions(options: string[]) {
        this._options = options;

        this.handleLocalChange();
    }

    handleLocalChange() {
        super.handleLocalChange();
        if (this._select)
            this._select.disabled = this.disabled();     
    }

    protected handleDataChanged() {
        this._value = this.getBinding().get();
        if (this.ui()) {
            this._select.value = this._value;
        }
        return super.handleDataChanged();
    }
    
    protected selfInit() {
        this.ui().classList.add("settings-view");
        this._select = document.createElement("select");
        this.ui().appendChild(this._select);
        this._select.classList.add("form-control");                 
        this._options.forEach(x=> {
            var opt: HTMLOptionElement = document.createElement("option")
            opt.text = x;
            opt.value = x;
            this._select.appendChild(opt);
        });
        this._select.value = this._value;
        this._select.disabled = this.disabled();
        this._select.onchange = e=> {
            var newValue = this.getValue()
            this.setAssociatedValue(newValue);
            this.onChange(this, newValue);
        };
    }
    
    getValue() {
        if (this.ui())
            this._value = this._select.value;        
        return this._value;
    }

    setValue(vl: string, fire?: boolean) {
        this._value = vl;
        if (this.ui()) {
            this._select.value = vl;
        }
        if (fire) this.onChange(this, this.getValue());
    }

    constructor(caption: string, private onChange: EventHandler = x=> x, ic: Icon = null) {
        super("div", ic);
        this.setCaption(caption);
    }
}

export class TextElement<T extends HTMLElement> extends BasicComponent<T> {

    public getText(): string {
        return this._text;
    }

    public setText(value: string, handle: boolean = true) {
        this._text = value;
        
        if (handle) this.handleLocalChange();
    }
    
    handleDataChanged() {
        this.setText(this.getBinding().get());
        super.handleDataChanged();
    }    

    private _text: string = "";

    constructor(tag: string, txt : string | IBinding = "", icon: Icon = null) {
        super(tag, icon);
        if (typeof(txt) == 'object') {
            this._binding = <IBinding> txt;
            this._binding.addListener(this._bListener);
            this._text = this.getBinding().get();
        } else
            this._text = <string> txt;
    }
    
    caption(): string {
        if (!super.caption())
            return this._text;
        else
            return super.caption();
    }

    protected customize(element: T) {
        element.textContent = this._text;
        super.customize(element);
    }
}

export class InlineHTMLElement extends BasicComponent<HTMLElement> {

    public getText(): string {
        return this._text;
    }

    public setText(value: string) {
        this._text = value;
        this.handleLocalChange();
    }
    
    handleDataChanged() {
        this.setText(this.getBinding().get());
        super.handleDataChanged();
    }    

    private _text: string = "";

    constructor(tag: string, txt: string = "", icon: Icon = null) {
        super(tag, icon);
        this._text = txt;
    }


    protected customize(element: HTMLElement) {
        element.innerHTML = this._text;
        super.customize(element);
    }
}

export class Label extends TextElement<HTMLSpanElement> {
    constructor(txt: string = "", icon: Icon = null) {
        super("label", txt, icon);
    }
}

export interface EventHandler {
    (c?:BasicComponent<any>, event?: any)
}

export class Panel extends BasicComponent<HTMLDivElement> {
    constructor(private _layoutType: LayoutType = LayoutType.BLOCK) {
        super(_layoutType == LayoutType.BLOCK ? "div" : "span");
        this.addClass(layoutTypeToString(_layoutType));
    }

    addChild(child: UIComponent, before?: UIComponent) {
        super.addChild(child, before);
        if (this._layoutType == LayoutType.BLOCK)
             alignComponents(this._children);
        
    }

    renderUI(align: boolean = true): HTMLDivElement {
        var renderedUI = super.renderUI();
         if (align && this._layoutType == LayoutType.BLOCK)
             alignComponents(this._children);
        
        return renderedUI;
    }

    // protected customize(element: HTMLDivElement) {
    //     super.customize(element);
    // }
}
export class WrapPanel extends Panel{

    setLabelWidth(n:number){
        if (this.children().length>0) {
            (<any>this.children()[0]).setLabelWidth(n);
        }
    }
    setLabelHeight(n: number){

    }
}
export enum ButtonSizes {
    NORMAL,
    EXTRA_SMALL,
    SMALL,
    LARGE
}

export enum ButtonHighlights {
    NO_HIGHLIGHT,
    PRIMARY,
    INFO,
    SUCCESS,
    WARNING,
    ERROR
}

export enum TextClasses {
    NORMAL,             // <div>Normal text</div>
    SMALLER,            // <div class='text-smaller'>Smaller text</div>
    SUBTLE,             // <div class='text-subtle'>Subtle text</div>
    HIGHLIGHT,          // <div class='text-highlight'>Highlighted text</div>
    INFO,               // <div class='text-info'>Info text</div>
    SUCCESS,            // <div class='text-success'>Success text</div>
    WARNING,            // <div class='text-warning'>Warning text</div>
    ERROR,              // <div class='text-error'>Error text</div>
}

function textClassToString(clazz: TextClasses) {
    switch (clazz) {
        case TextClasses.NORMAL    : return "text-normal";
        case TextClasses.SMALLER   : return "text-smaller";
        case TextClasses.SUBTLE    : return "text-subtle";
        case TextClasses.HIGHLIGHT : return "text-highlight";
        case TextClasses.INFO      : return "text-info";
        case TextClasses.SUCCESS   : return "text-success";
        case TextClasses.WARNING   : return "text-warning";
        case TextClasses.ERROR     : return "text-error";
        default                    : return "";
    }
}

export enum HighLightClasses {
    NONE,               // <span class='inline-block'>Normal</span>
    HIGHLIGHT,          // <span class='inline-block highlight'>Highlighted</span>
    HIGHLIGHT_INFO,     // <span class='inline-block highlight-info'>Info</span>
    HIGHLIGHT_SUCCESS,  // <span class='inline-block highlight-success'>Success</span>
    HIGHLIGHT_WARNING,  // <span class='inline-block highlight-warning'>Warning</span>
    HIGHLIGHT_ERROR,    // <span class='inline-block highlight-error'>Error</span>
}

function highlightToText(clazz: HighLightClasses) {
    switch (clazz) {
        case HighLightClasses.NONE                 : return "no-highlight";
        case HighLightClasses.HIGHLIGHT            : return "highlight";
        case HighLightClasses.HIGHLIGHT_INFO       : return "highlight-info";
        case HighLightClasses.HIGHLIGHT_SUCCESS    : return "highlight-success";
        case HighLightClasses.HIGHLIGHT_WARNING    : return "highlight-warning";
        case HighLightClasses.HIGHLIGHT_ERROR      : return "highlight-error";
        default                                    : return null;
    }
}

export enum LayoutType {
    BLOCK,                  // <div class='block'>Block text</div>
    INLINE_BLOCK,           // <div class='inline-block'>Inline block text</div>
    INLINE_BLOCK_TIGHT,     // <div class='inline-block-tight'>Inline block text (tight)</div>
    BTN_GROUP               // <div class='btn-group'>Button group</div>
}

function layoutTypeToString(layoutType: LayoutType) {
    switch (layoutType) {
        case LayoutType.BLOCK               : return "block";
        case LayoutType.INLINE_BLOCK        : return "inline-block";
        case LayoutType.INLINE_BLOCK_TIGHT  : return "inline-block-tight";
        case LayoutType.BTN_GROUP           : return "btn-group";
        default                             : return null;
    }
}

export enum Icon {
    NONE,
    ALERT,
    ALIGNMENT_ALIGN,
    ALIGNMENT_ALIGNED_TO,
    ALIGNMENT_UNALIGN,
    ARROW_DOWN,
    ARROW_LEFT,
    ARROW_RIGHT,
    ARROW_SMALL_DOWN,
    ARROW_SMALL_LEFT,
    ARROW_SMALL_RIGHT,
    ARROW_SMALL_UP,
    ARROW_UP,
    BEER,
    BOOK,
    BOOKMARK,
    BRIEFCASE,
    BROADCAST,
    BROWSER,
    BUG,
    CALENDAR,
    CHECK,
    CHECKLIST,
    CHEVRON_DOWN,
    CHEVRON_LEFT,
    CHEVRON_RIGHT,
    CHEVRON_UP,
    CIRCLE_SLASH,
    CIRCUIT_BOARD,
    CLIPPY,
    CLOCK,
    CLOUD_DOWNLOAD,
    CLOUD_UPLOAD,
    CODE,
    COLOR_MODE,
    COMMENT_ADD,
    COMMENT,
    COMMENT_DISCUSSION,
    CREDIT_CARD,
    DASH,
    DASHBOARD,
    DATABASE,
    DEVICE_CAMERA,
    DEVICE_CAMERA_VIDEO,
    DEVICE_DESKTOP,
    DEVICE_MOBILE,
    DIFF,
    DIFF_ADDED,
    DIFF_IGNORED,
    DIFF_MODIFIED,
    DIFF_REMOVED,
    DIFF_RENAMED,
    ELLIPSIS,
    EYE_UNWATCH,
    EYE_WATCH,
    EYE,
    FILE_BINARY,
    FILE_CODE,
    FILE_DIRECTORY,
    FILE_MEDIA,
    FILE_PDF,
    FILE_SUBMODULE,
    FILE_SYMLINK_DIRECTORY,
    FILE_SYMLINK_FILE,
    FILE_TEXT,
    FILE_ZIP,
    FLAME,
    FOLD,
    GEAR,
    GIFT,
    GIST,
    GIST_SECRET,
    GIT_BRANCH_CREATE,
    GIT_BRANCH_DELETE,
    GIT_BRANCH,
    GIT_COMMIT,
    GIT_COMPARE,
    GIT_MERGE,
    GIT_PULL_REQUEST_ABANDONED,
    GIT_PULL_REQUEST,
    GLOBE,
    GRAPH,
    HEART,
    HISTORY,
    HOME,
    HORIZONTAL_RULE,
    HOURGLASS,
    HUBOT,
    INBOX,
    INFO,
    ISSUE_CLOSED,
    ISSUE_OPENED,
    ISSUE_REOPENED,
    JERSEY,
    JUMP_DOWN,
    JUMP_LEFT,
    JUMP_RIGHT,
    JUMP_UP,
    KEY,
    KEYBOARD,
    LAW,
    LIGHT_BULB,
    LINK,
    LINK_EXTERNAL,
    LIST_ORDERED,
    LIST_UNORDERED,
    LOCATION,
    GIST_PRIVATE,
    MIRROR_PRIVATE,
    GIT_FORK_PRIVATE,
    LOCK,
    LOGO_GITHUB,
    MAIL,
    MAIL_READ,
    MAIL_REPLY,
    MARK_GITHUB,
    MARKDOWN,
    MEGAPHONE,
    MENTION,
    MICROSCOPE,
    MILESTONE,
    MIRROR_PUBLIC,
    MIRROR,
    MORTAR_BOARD,
    MOVE_DOWN,
    MOVE_LEFT,
    MOVE_RIGHT,
    MOVE_UP,
    MUTE,
    NO_NEWLINE,
    OCTOFACE,
    ORGANIZATION,
    PACKAGE,
    PAINTCAN,
    PENCIL,
    PERSON_ADD,
    PERSON_FOLLOW,
    PERSON,
    PIN,
    PLAYBACK_FAST_FORWARD,
    PLAYBACK_PAUSE,
    PLAYBACK_PLAY,
    PLAYBACK_REWIND,
    PLUG,
    REPO_CREATE,
    GIST_NEW,
    FILE_DIRECTORY_CREATE,
    FILE_ADD,
    PLUS,
    PODIUM,
    PRIMITIVE_DOT,
    PRIMITIVE_SQUARE,
    PULSE,
    PUZZLE,
    QUESTION,
    QUOTE,
    RADIO_TOWER,
    REPO_DELETE,
    REPO,
    REPO_CLONE,
    REPO_FORCE_PUSH,
    GIST_FORK,
    REPO_FORKED,
    REPO_PULL,
    REPO_PUSH,
    ROCKET,
    RSS,
    RUBY,
    SCREEN_FULL,
    SCREEN_NORMAL,
    SEARCH_SAVE,
    SEARCH,
    SERVER,
    SETTINGS,
    LOG_IN,
    SIGN_IN,
    LOG_OUT,
    SIGN_OUT,
    SPLIT,
    SQUIRREL,
    STAR_ADD,
    STAR_DELETE,
    STAR,
    STEPS,
    STOP,
    REPO_SYNC,
    SYNC,
    TAG_REMOVE,
    TAG_ADD,
    TAG,
    TELESCOPE,
    TERMINAL,
    THREE_BARS,
    THUMBSDOWN,
    THUMBSUP,
    TOOLS,
    TRASHCAN,
    TRIANGLE_DOWN,
    TRIANGLE_LEFT,
    TRIANGLE_RIGHT,
    TRIANGLE_UP,
    UNFOLD,
    UNMUTE,
    VERSIONS,
    REMOVE_CLOSE,
    X,
    ZAP
}

export function iconToClass(icon: Icon): string {
    switch (icon) {
        case Icon.ALERT                     : return 'icon-alert';
        case Icon.ALIGNMENT_ALIGN           : return 'icon-alignment-align';
        case Icon.ALIGNMENT_ALIGNED_TO      : return 'icon-alignment-aligned-to';
        case Icon.ALIGNMENT_UNALIGN         : return 'icon-alignment-unalign';
        case Icon.ARROW_DOWN                : return 'icon-arrow-down';
        case Icon.ARROW_LEFT                : return 'icon-arrow-left';
        case Icon.ARROW_RIGHT               : return 'icon-arrow-right';
        case Icon.ARROW_SMALL_DOWN          : return 'icon-arrow-small-down';
        case Icon.ARROW_SMALL_LEFT          : return 'icon-arrow-small-left';
        case Icon.ARROW_SMALL_RIGHT         : return 'icon-arrow-small-right';
        case Icon.ARROW_SMALL_UP            : return 'icon-arrow-small-up';
        case Icon.ARROW_UP                  : return 'icon-arrow-up';
        case Icon.BEER                      : return 'icon-beer';
        case Icon.BOOK                      : return 'icon-book';
        case Icon.BOOKMARK                  : return 'icon-bookmark';
        case Icon.BRIEFCASE                 : return 'icon-briefcase';
        case Icon.BROADCAST                 : return 'icon-broadcast';
        case Icon.BROWSER                   : return 'icon-browser';
        case Icon.BUG                       : return 'icon-bug';
        case Icon.CALENDAR                  : return 'icon-calendar';
        case Icon.CHECK                     : return 'icon-check';
        case Icon.CHECKLIST                 : return 'icon-checklist';
        case Icon.CHEVRON_DOWN              : return 'icon-chevron-down';
        case Icon.CHEVRON_LEFT              : return 'icon-chevron-left';
        case Icon.CHEVRON_RIGHT             : return 'icon-chevron-right';
        case Icon.CHEVRON_UP                : return 'icon-chevron-up';
        case Icon.CIRCLE_SLASH              : return 'icon-circle-slash';
        case Icon.CIRCUIT_BOARD             : return 'icon-circuit-board';
        case Icon.CLIPPY                    : return 'icon-clippy';
        case Icon.CLOCK                     : return 'icon-clock';
        case Icon.CLOUD_DOWNLOAD            : return 'icon-cloud-download';
        case Icon.CLOUD_UPLOAD              : return 'icon-cloud-upload';
        case Icon.CODE                      : return 'icon-code';
        case Icon.COLOR_MODE                : return 'icon-color-mode';
        case Icon.COMMENT_ADD               : return 'icon-comment-add';
        case Icon.COMMENT                   : return 'icon-comment';
        case Icon.COMMENT_DISCUSSION        : return 'icon-comment-discussion';
        case Icon.CREDIT_CARD               : return 'icon-credit-card';
        case Icon.DASH                      : return 'icon-dash';
        case Icon.DASHBOARD                 : return 'icon-dashboard';
        case Icon.DATABASE                  : return 'icon-database';
        case Icon.DEVICE_CAMERA             : return 'icon-device-camera';
        case Icon.DEVICE_CAMERA_VIDEO       : return 'icon-device-camera-video';
        case Icon.DEVICE_DESKTOP            : return 'icon-device-desktop';
        case Icon.DEVICE_MOBILE             : return 'icon-device-mobile';
        case Icon.DIFF                      : return 'icon-diff';
        case Icon.DIFF_ADDED                : return 'icon-diff-added';
        case Icon.DIFF_IGNORED              : return 'icon-diff-ignored';
        case Icon.DIFF_MODIFIED             : return 'icon-diff-modified';
        case Icon.DIFF_REMOVED              : return 'icon-diff-removed';
        case Icon.DIFF_RENAMED              : return 'icon-diff-renamed';
        case Icon.ELLIPSIS                  : return 'icon-ellipsis';
        case Icon.EYE_UNWATCH               : return 'icon-eye-unwatch';
        case Icon.EYE_WATCH                 : return 'icon-eye-watch';
        case Icon.EYE                       : return 'icon-eye';
        case Icon.FILE_BINARY               : return 'icon-file-binary';
        case Icon.FILE_CODE                 : return 'icon-file-code';
        case Icon.FILE_DIRECTORY            : return 'icon-file-directory';
        case Icon.FILE_MEDIA                : return 'icon-file-media';
        case Icon.FILE_PDF                  : return 'icon-file-pdf';
        case Icon.FILE_SUBMODULE            : return 'icon-file-submodule';
        case Icon.FILE_SYMLINK_DIRECTORY    : return 'icon-file-symlink-directory';
        case Icon.FILE_SYMLINK_FILE         : return 'icon-file-symlink-file';
        case Icon.FILE_TEXT                 : return 'icon-file-text';
        case Icon.FILE_ZIP                  : return 'icon-file-zip';
        case Icon.FLAME                     : return 'icon-flame';
        case Icon.FOLD                      : return 'icon-fold';
        case Icon.GEAR                      : return 'icon-gear';
        case Icon.GIFT                      : return 'icon-gift';
        case Icon.GIST                      : return 'icon-gist';
        case Icon.GIST_SECRET               : return 'icon-gist-secret';
        case Icon.GIT_BRANCH_CREATE         : return 'icon-git-branch-create';
        case Icon.GIT_BRANCH_DELETE         : return 'icon-git-branch-delete';
        case Icon.GIT_BRANCH                : return 'icon-git-branch';
        case Icon.GIT_COMMIT                : return 'icon-git-commit';
        case Icon.GIT_COMPARE               : return 'icon-git-compare';
        case Icon.GIT_MERGE                 : return 'icon-git-merge';
        case Icon.GIT_PULL_REQUEST_ABANDONED: return 'icon-git-pull-request-abandoned';
        case Icon.GIT_PULL_REQUEST          : return 'icon-git-pull-request';
        case Icon.GLOBE                     : return 'icon-globe'; 
        case Icon.GRAPH                     : return 'icon-graph';
        case Icon.HEART                     : return 'icon-heart';
        case Icon.HISTORY                   : return 'icon-history';
        case Icon.HOME                      : return 'icon-home';
        case Icon.HORIZONTAL_RULE           : return 'icon-horizontal-rule';
        case Icon.HOURGLASS                 : return 'icon-hourglass';
        case Icon.HUBOT                     : return 'icon-hubot';
        case Icon.INBOX                     : return 'icon-inbox';
        case Icon.INFO                      : return 'icon-info';
        case Icon.ISSUE_CLOSED              : return 'icon-issue-closed';
        case Icon.ISSUE_OPENED              : return 'icon-issue-opened';
        case Icon.ISSUE_REOPENED            : return 'icon-issue-reopened';
        case Icon.JERSEY                    : return 'icon-jersey';
        case Icon.JUMP_DOWN                 : return 'icon-jump-down';
        case Icon.JUMP_LEFT                 : return 'icon-jump-left';
        case Icon.JUMP_RIGHT                : return 'icon-jump-right';
        case Icon.JUMP_UP                   : return 'icon-jump-up';
        case Icon.KEY                       : return 'icon-key';
        case Icon.KEYBOARD                  : return 'icon-keyboard';
        case Icon.LAW                       : return 'icon-law';
        case Icon.LIGHT_BULB                : return 'icon-light-bulb';
        case Icon.LINK                      : return 'icon-link';
        case Icon.LINK_EXTERNAL             : return 'icon-link-external';
        case Icon.LIST_ORDERED              : return 'icon-list-ordered';
        case Icon.LIST_UNORDERED            : return 'icon-list-unordered';
        case Icon.LOCATION                  : return 'icon-location';
        case Icon.GIST_PRIVATE              : return 'icon-gist-private';
        case Icon.MIRROR_PRIVATE            : return 'icon-mirror-private';
        case Icon.GIT_FORK_PRIVATE          : return 'icon-git-fork-private';
        case Icon.LOCK                      : return 'icon-lock';
        case Icon.LOGO_GITHUB               : return 'icon-logo-github';
        case Icon.MAIL                      : return 'icon-mail';
        case Icon.MAIL_READ                 : return 'icon-mail-read';
        case Icon.MAIL_REPLY                : return 'icon-mail-reply';
        case Icon.MARK_GITHUB               : return 'icon-mark-github';
        case Icon.MARKDOWN                  : return 'icon-markdown';
        case Icon.MEGAPHONE                 : return 'icon-megaphone';
        case Icon.MENTION                   : return 'icon-mention';
        case Icon.MICROSCOPE                : return 'icon-microscope';
        case Icon.MILESTONE                 : return 'icon-milestone';
        case Icon.MIRROR_PUBLIC             : return 'icon-mirror-public';
        case Icon.MIRROR                    : return 'icon-mirror';
        case Icon.MORTAR_BOARD              : return 'icon-mortar-board';
        case Icon.MOVE_DOWN                 : return 'icon-move-down';
        case Icon.MOVE_LEFT                 : return 'icon-move-left';
        case Icon.MOVE_RIGHT                : return 'icon-move-right';
        case Icon.MOVE_UP                   : return 'icon-move-up';
        case Icon.MUTE                      : return 'icon-mute';
        case Icon.NO_NEWLINE                : return 'icon-no-newline';
        case Icon.OCTOFACE                  : return 'icon-octoface';
        case Icon.ORGANIZATION              : return 'icon-organization';
        case Icon.PACKAGE                   : return 'icon-package';
        case Icon.PAINTCAN                  : return 'icon-paintcan';
        case Icon.PENCIL                    : return 'icon-pencil';
        case Icon.PERSON_ADD                : return 'icon-person-add';
        case Icon.PERSON_FOLLOW             : return 'icon-person-follow';
        case Icon.PERSON                    : return 'icon-person';
        case Icon.PIN                       : return 'icon-pin';
        case Icon.PLAYBACK_FAST_FORWARD     : return 'icon-playback-fast-forward';
        case Icon.PLAYBACK_PAUSE            : return 'icon-playback-pause';
        case Icon.PLAYBACK_PLAY             : return 'icon-playback-play';
        case Icon.PLAYBACK_REWIND           : return 'icon-playback-rewind';
        case Icon.PLUG                      : return 'icon-plug';
        case Icon.REPO_CREATE               : return 'icon-repo-create';
        case Icon.GIST_NEW                  : return 'icon-gist-new';
        case Icon.FILE_DIRECTORY_CREATE     : return 'icon-file-directory-create';
        case Icon.FILE_ADD                  : return 'icon-file-add';
        case Icon.PLUS                      : return 'icon-plus';
        case Icon.PODIUM                    : return 'icon-podium';
        case Icon.PRIMITIVE_DOT             : return 'icon-primitive-dot';
        case Icon.PRIMITIVE_SQUARE          : return 'icon-primitive-square';
        case Icon.PULSE                     : return 'icon-pulse';
        case Icon.PUZZLE                    : return 'icon-puzzle';
        case Icon.QUESTION                  : return 'icon-question';
        case Icon.QUOTE                     : return 'icon-quote';
        case Icon.RADIO_TOWER               : return 'icon-radio-tower';
        case Icon.REPO_DELETE               : return 'icon-repo-delete';
        case Icon.REPO                      : return 'icon-repo';
        case Icon.REPO_CLONE                : return 'icon-repo-clone';
        case Icon.REPO_FORCE_PUSH           : return 'icon-repo-force-push';
        case Icon.GIST_FORK                 : return 'icon-gist-fork';
        case Icon.REPO_FORKED               : return 'icon-repo-forked';
        case Icon.REPO_PULL                 : return 'icon-repo-pull';
        case Icon.REPO_PUSH                 : return 'icon-repo-push';
        case Icon.ROCKET                    : return 'icon-rocket';
        case Icon.RSS                       : return 'icon-rss';
        case Icon.RUBY                      : return 'icon-ruby';
        case Icon.SCREEN_FULL               : return 'icon-screen-full';
        case Icon.SCREEN_NORMAL             : return 'icon-screen-normal';
        case Icon.SEARCH_SAVE               : return 'icon-search-save';
        case Icon.SEARCH                    : return 'icon-search';
        case Icon.SERVER                    : return 'icon-server';
        case Icon.SETTINGS                  : return 'icon-settings';
        case Icon.LOG_IN                    : return 'icon-log-in';
        case Icon.SIGN_IN                   : return 'icon-sign-in';
        case Icon.LOG_OUT                   : return 'icon-log-out';
        case Icon.SIGN_OUT                  : return 'icon-sign-out';
        case Icon.SPLIT                     : return 'icon-split';
        case Icon.SQUIRREL                  : return 'icon-squirrel';
        case Icon.STAR_ADD                  : return 'icon-star-add';
        case Icon.STAR_DELETE               : return 'icon-star-delete';
        case Icon.STAR                      : return 'icon-star';
        case Icon.STEPS                     : return 'icon-steps';
        case Icon.STOP                      : return 'icon-stop';
        case Icon.REPO_SYNC                 : return 'icon-repo-sync';
        case Icon.SYNC                      : return 'icon-sync';
        case Icon.TAG_REMOVE                : return 'icon-tag-remove';
        case Icon.TAG_ADD                   : return 'icon-tag-add';
        case Icon.TAG                       : return 'icon-tag';
        case Icon.TELESCOPE                 : return 'icon-telescope';
        case Icon.TERMINAL                  : return 'icon-terminal';
        case Icon.THREE_BARS                : return 'icon-three-bars';
        case Icon.THUMBSDOWN                : return 'icon-thumbsdown';
        case Icon.THUMBSUP                  : return 'icon-thumbsup';
        case Icon.TOOLS                     : return 'icon-tools';
        case Icon.TRASHCAN                  : return 'icon-trashcan';
        case Icon.TRIANGLE_DOWN             : return 'icon-triangle-down';
        case Icon.TRIANGLE_LEFT             : return 'icon-triangle-left';
        case Icon.TRIANGLE_RIGHT            : return 'icon-triangle-right';
        case Icon.TRIANGLE_UP               : return 'icon-triangle-up';
        case Icon.UNFOLD                    : return 'icon-unfold';
        case Icon.UNMUTE                    : return 'icon-unmute';
        case Icon.VERSIONS                  : return 'icon-versions';
        case Icon.REMOVE_CLOSE              : return 'icon-remove-close';
        case Icon.X                         : return 'icon-x';
        case Icon.ZAP                       : return 'icon-zap';
        default                             : throw new Error("Should never happen");
    }    
}

export class Button extends BasicComponent<HTMLButtonElement> {

    private static sizeString(buttonSize: ButtonSizes): string {
        switch (buttonSize) {
            case ButtonSizes.NORMAL         : return "normal";
            case ButtonSizes.EXTRA_SMALL    : return "btn-xs";
            case ButtonSizes.SMALL          : return "btn-sm";
            case ButtonSizes.LARGE          : return "btn-lg";
            default                         : return null;
        }
    }

    private static highlightString(highlight: ButtonHighlights): string {
        switch (highlight) {
            case ButtonHighlights.NO_HIGHLIGHT  : return "no";
            case ButtonHighlights.PRIMARY       : return "btn-primary";
            case ButtonHighlights.INFO          : return "btn-info";
            case ButtonHighlights.WARNING       : return "btn-warning";
            case ButtonHighlights.ERROR         : return "btn-error";
            case ButtonHighlights.SUCCESS       : return "btn-success";
            default                             : return null;
        }
    }

    constructor(content: string, private _size: ButtonSizes = ButtonSizes.NORMAL, 
                protected _highlight: ButtonHighlights = ButtonHighlights.NO_HIGHLIGHT, 
                _icon: Icon = null, onClick: EventHandler = null) {
            super("button", _icon);
            if(onClick) {
                this.addOnClickListener(onClick);
            }
            this._text = content;
    }

    public getText(): string {
        return this._text;
    }

    public setText(value: string) {
        this._text = value;
        this._ui.value = value;
        //this.handleLocalChange();
    }

    handleDataChanged() {
        this.setText(this.getBinding().get());
        super.handleDataChanged();
    }

    private _text: string = "";
    private _oldHighlightClass: string;
    private _oldSizeClass: string

    protected customize(element: HTMLButtonElement) {
        super.customize(element);
        element.textContent = this._text;
        var h = Button.highlightString(this._highlight);
        if (this._oldHighlightClass) {
            element.classList.remove(this._oldHighlightClass)
        }
        this._oldHighlightClass = h;
        element.classList.add(h);
        if (this._oldSizeClass) {
            element.classList.remove(this._oldSizeClass)
        }
        var s = Button.sizeString(this._size);
        this._oldSizeClass = s;
        element.classList.add(s);
        element.classList.add("btn");

    }
}

export class ToggleButton extends Button {

    private _selected: boolean = false;
    
    getSelected() {
        return this._selected;
    }
    
    handleDataChanged() {
        this.setSelected(this.getBinding().get());
        super.handleDataChanged();
    }    
 
    setSelected(selected: boolean): ToggleButton {
        this._selected = selected;
        this._highlight = selected ? ButtonHighlights.INFO : this._defaultHighlight;    
        this.handleLocalChange();

        return this;
    }
    
    toggle() {
        this.setSelected(!this._selected);
    }
    private _defaultHighlight : ButtonHighlights;
    constructor(content: string, size: ButtonSizes, highlight: ButtonHighlights, icon: Icon, onClick: EventHandler) {
        super(content, size, highlight, icon, e=> { (<ToggleButton>e).toggle(); onClick(e) });
        this._defaultHighlight = highlight;
    }
}

export interface WidgetCreator<T> {
    (model: T): BasicComponent<any>
}

export interface ICellRenderer<T> {
    render(model: T): BasicComponent<any>;
}

export class SimpleRenderer<T> implements ICellRenderer<T> {

    constructor(private _renderFunc: WidgetCreator<T>) { }
    
    render(model: T): BasicComponent<any> {
        return this._renderFunc(model);
    }
}

export interface ListenableCellRenderer<T> extends ICellRenderer<T>, IListenable<EventHandler> { }

export interface IStructuredContentProvider<M, T> {
    elements(model: M): T[];
    init(viewer: StructuredViewer<M, T>);
    dispose();
}

export interface ITreeContentProvider<M, T> extends IStructuredContentProvider<M, T> {
    hasChildren(element: T): boolean;
    children(element: T): T[]
}

export class PropertyChangeEvent {
    constructor(public source: any, public value: any = null, public property: string = null) { }
}

export interface PropertyChangeListener {
    (e: PropertyChangeEvent);
}
export interface ViewerFilter<T> extends IListenable<PropertyChangeListener> {

    accept(viewer: StructuredViewer<any, T>, value: T, parent: T): boolean
}
export interface ViewerSorter<T> extends IListenable<PropertyChangeListener> {
    order(viewer: StructuredViewer<any, T>, value: T, parent: T): number
}

/*
 * Viewer is an unordered list with a model. It doesn't actually show anything.
 */
export class Viewer<M> extends BasicComponent<HTMLElement> {
    public getInput(): M {
        return this._model;
    }

    public setInput(value: M, refresh: boolean = true) {
        this._model = value;
        try {
            this.smartUpdateContent();
        } catch (e) {
            console.log("Error at setInput: ", e);
        }
     }

    _contentui : BasicComponent<HTMLElement> = new BasicComponent("ul");
    
    updateContent() { this.refresh(); }
    smartUpdateContent() { this.refresh(); }
    
    
    _children: UIComponent[] = [this._contentui];   
    
    protected _model: M;
}

export interface SelectionProvider<T> {
    addSelectionListener(l: ISelectionListener<T>);
    removeSelectionListener(l: ISelectionListener<any>);
    getSelection(): StructuredSelection<T>;
}

export interface SelectionViewer<T> extends SelectionProvider<T>, UIComponent {}

export class StructuredViewer<M, T> extends Viewer<M> implements SelectionViewer<T> {

    private selectionListeners: ISelectionListener<T>[] = [];

    protected viewerFilters: ViewerFilter<T>[] = []
    protected viewerSorter: ViewerSorter<T>;

    protected basicLabelProvider: LabelFunction<T>;

    setBasicLabelFunction(f: LabelFunction<T>) {
        this.basicLabelProvider = f;
    }
    
    getBasicLabelFunction(): LabelFunction<T> {
        return this.basicLabelProvider;
    }
    protected _keyProvider: KeyProvider<T>

    setKeyProvider(kp: KeyProvider<T>) {
        this._keyProvider = kp;
    }
    getKeyProvider(): KeyProvider<T> {
        return this._keyProvider;
    }

    protected nodeKey(node: T): any {
        if (this._keyProvider) {
            return this._keyProvider.key(node)
        }
        if (!node) {
            return "";
        }
        if (node['id']) {
            if (typeof node['id'] == 'function') {
                return node['id']();
            }
        }
        return node;
    }

    lst: PropertyChangeListener = (e: PropertyChangeEvent) => {
        this.refresh();
    }

    addViewerFilter(filter: ViewerFilter<T>) {
        this.viewerFilters.push(filter);
        filter.addListener(this.lst)
        this.refresh();
    }
    removeViewerFilter(filter: ViewerFilter<T>) {
        this.viewerFilters = this.viewerFilters.filter(x=> x != filter);
        filter.removeListener(this.lst)
        this.refresh();
    }

    getViewerFilters(): ViewerFilter<T>[] {
        return [].concat(this.viewerFilters);
    }
    setViewerSorder(sorter: ViewerSorter<T>) {
        this.viewerSorter = sorter;
        this.refresh();
    }
    getViewerSorter() {
        return this.viewerSorter;
    }

    addSelectionListener(l: ISelectionListener<T>) {
        this.selectionListeners.push(l);
    }
    removeSelectionListener(l: ISelectionListener<any>) {
        this.selectionListeners = this.selectionListeners.filter(x=> x != l);
    }
    
    protected currentSelection: T[] = [];
    protected currentSelectionIds: any[] = [];

    protected setSelectionInternal(newValue: T[]) {
        if (this.currentSelection != newValue) {
            var oldS = new StructuredSelection(this.currentSelection)
            var newS = new StructuredSelection(newValue)
            var event = new SelectionChangedEvent(this, oldS, newS)
            this.selectionListeners.forEach(x=> x.selectionChanged(event))
            this.currentSelection = newValue;
            this.currentSelectionIds = newValue.map(x=> this.nodeKey(x))
        }
    }
    
    getSelection(): StructuredSelection<T> {
        return new StructuredSelection([].concat(this.currentSelection));
    }
    
    protected getRenderedContent(p: T): T[] {
        var unfilteredContent = this.unfilteredContent(p);
        if (unfilteredContent) {
            if (Array.isArray(unfilteredContent)) {
                var elements: T[] = <T[]>unfilteredContent;
                this.viewerFilters.forEach(x=> {
                    elements = elements.filter(el=> x.accept(this, el, p))
                })
                if (this.viewerSorter) {
                    elements = _.sortBy(elements, el=> this.viewerSorter.order(this, el, p));
                }
                return elements;
                // this.renderContent(contentPane, <T[]>elements)
            }
        }
        return unfilteredContent;
    }

    protected unfilteredContent(p: T): T[] {
        return this._cp.elements(this.getInput());
    }


    constructor(private _cp: IStructuredContentProvider<M, T>, protected renderer: ICellRenderer<T>) {
        super("div", null);
        _cp.init(this);
        
        if (this.renderer instanceof BasicListanable) {
            (<BasicListanable<PropertyChangeEvent, PropertyChangeListener>><any>renderer).addListener(this.eh);
        }
    }
    
    private eh: PropertyChangeListener = x=> {
        this.updateContent();
        //x.property._ui.refresh();        
    };

    protected processChildren(model: T, view: BasicComponent<any>) : BasicComponent<any> { return null; }
    
    dispose() {
        if (this.renderer instanceof BasicListanable) {
            (<BasicListanable<PropertyChangeEvent, PropertyChangeListener>><any>renderer).removeListener(this.eh);
        }
        super.dispose();
        this._cp.dispose();
    }
}

export class ArrayContentProvider<T> implements  IStructuredContentProvider<T[],T>{
    elements(model:T[]):any {
        return model;
    }

    init(viewer) {
    }

    dispose() {
    }
}
export interface LabelFunction<T> {
    (m:T):string
}
export interface IconFunction<T>{
    (m:T):Icon
}
export interface Selection{
    isEmpty():boolean

}
export class StructuredSelection<T> implements Selection{
    elements:T[]=[];


    isEmpty(){
        return this.elements.length==0;
    }

    constructor(elements:T[]|T){
        if (Array.isArray(elements)) {
            this.elements =<T[]> elements;
        }
        else{
            this.elements=[<T>elements];
        }
    }
}
export class SelectionChangedEvent<T>{
    source:StructuredViewer<any,T>;
    oldSelection:StructuredSelection<T>
    selection:StructuredSelection<T>

    constructor(source:StructuredViewer<any,T>,
    oldSelection:StructuredSelection<T>,
    selection:StructuredSelection<T>){
        this.source=source;
        this.oldSelection=oldSelection;
        this.selection=selection;
    }
}

export interface ISelectionListener<T>{
    selectionChanged(event:SelectionChangedEvent<T>);
}

export class LabelRenderer<T> implements ICellRenderer<T>{
    constructor(private _label:LabelFunction<T>,private ic:IconFunction<T>=null) {
    }

    render(model:T):BasicComponent<any> {
        var label:Label=new Label(this._label(model),this.ic?this.ic(model):null);
        return label;
    }
}



export class ListView<M, T> extends StructuredViewer<M, T>{
    
    private treeModel : tm.TreeModel<T, BasicComponent<HTMLElement>>;

    getTreeModel() {
        if (!this.treeModel) this.treeModel = new tm.TreeModel<T, BasicComponent<HTMLElement>>(this._contentui);
        return this.treeModel;
    }
    
    setBasicLabelFunction(f: LabelFunction<T>) {
        this.basicLabelProvider = f;
    }    
    clear () {
        var model = this.getTreeModel();
        
        var root = model.get(null);
        root.container.children().forEach(child=>root.container.removeChild(child));
        
        this._selected = null;
        this.selectedComponents = [];
        
        this.getTreeModel().clear();
    }

    put(element: T, parent: T, after: boolean = false, neighbour?: T) {
        var pNode = this.treeModel.get(parent);
        var nNode = this.treeModel.get(neighbour, pNode);
        
        var nView = nNode ? nNode.view : null;

        this.getTreeModel().insert(element, pNode, nNode, after);
        
        var preview   = this.renderer.render(element),
            view      = this.wrapChild(element, preview);
        
        if (after == true && neighbour == null) {
            after = false;
            nView = <any> pNode.container.children()[0];
        }
                    
        pNode.container.addChild(view, nView, after);
    }
    
    insertBefore(element: T, parent: T, before?: T) {
        return this.put(element, parent, false, before);
    }
    insertAfter(element: T, parent: T, after?: T) {
        return this.put(element, parent, true, after);
    }
    
    remove(element: T) {
        var node = this.treeModel.get(element);
        if (!node) return;
        this.unselectItem(node.view);
        node.parent.container.removeChild(node.view);
        
        this.treeModel.remove(node);
    }

    private _cmp: (x: T, y: T) => boolean;
    
    setComparator(cmp:(x: T, y: T) => boolean) {
        this._cmp = cmp;
    }    
    getComparator() {
        if (this._cmp) return this._cmp;
        return (x, y) => x.hashkey != null && x.__hashkey__ == y.__hashkey__; 
    }
    
    private propagateHashKey(parent: T, element: T) {
        if (element['__hashkey__']) return;
        if (typeof element['hashkey'] == "function") element['__hashkey__'] = element['hashkey'](); 
        else if (this.getBasicLabelFunction()) {
            var param = this.getBasicLabelFunction()(element);
            element['__hashkey__'] = parent ? parent['__hashkey__'] + "::" + param : param;
        }
    }
    
    smartUpdateContent(model: T = null) {
        var pelements = this.getRenderedContent(model);
        if (!pelements || !Array.isArray(pelements)) return;
        
        this.customizePanel();
        
        var elements = <T[]> pelements,        
            oldElements = this.getTreeModel().get(model).children.map(x=>x.data);
            
        elements.forEach(e => this.propagateHashKey(model, e));
        
        var differences = diff.diff(elements, oldElements, this.getComparator());

        var after: T = null;
        differences.forEach(diff => {
            switch (diff.type) {
                case '+':
                    this.insertAfter(diff.element, model, after);
                    after = diff.element;
                    break;
                case '-':
                    this.remove(diff.element);
                    break;
                case '=':
                    this.treeModel.patch(oldElements[diff.bi], after = elements[diff.ai]);
                    this.smartUpdateContent(after);
                    break;
                default: 
                    throw "That should not ever happen. (DIFF_CORRUPTED_SMART_UPDATE_CONTENT)"; 
            }
        });
    }
    
    protected _panelCustomized: boolean = false;
    
    customizePanel(forced: boolean = false) {
        if (!forced && this._panelCustomized === true) return;
        this._panelCustomized = true;
        var cpane = this._contentui.ui();
        cpane.onkeydown = e=> this.handleKey(e);
        cpane.classList.add("focusable-panel")
        cpane.classList.add("list-group");
        cpane.tabIndex = -1;
    }
    
    private _scrollTo = 0;

    tryScrollToSelected() {
        try {
            var p : UIComponent = this.parent();
            //while (p && !(p instanceof SC.Scrollable)) p = p.parent();
            //
            //var ps : SC.Scrollable = <any> p;
            //
            //var sz = ps.size();
            //
            //var offset = this._selected.ui().offsetTop;
            //
            //if (offset < sz.top)
            //    ps.scroll(offset - 40, 0);
            //else if (offset + this._selected.ui().clientHeight > sz.bottom)
            //    ps.scroll(offset - (sz.bottom - sz.top) + 80, 0);
                
        } catch (e) {
            
        }        
    }

    protected _selected: BasicComponent<any>;

    protected handleKey(e: KeyboardEvent) {
        if (e.keyCode == 40) {
            this.navigateDown();
        }
        if (e.keyCode == 38) {
            this.navigateUp();
        }
    }
    
    navigateDown() {
        // var index = this._components.indexOf(this._selected)
        // if (index == -1) return;
        // if (index < this._components.length - 1) {
        //     this.setSelection(this._components[index + 1].getBinding().get())
        //     this.focusPane();
        // }
    }
    
    navigateUp() {
        // var index = this._components.indexOf(this._selected)
        // if (index > 0) {
        //     this.setSelection(this._components[index - 1].getBinding().get())
        //     this.focusPane()
        // }
    }

    private focusPane() {
        this._contentui.ui().focus();
    }
    
    protected wrapChild(element: T, preview: BasicComponent<any>): BasicComponent<any> {
        var view = new BasicComponent("li");

        view.setBinding(new BasicBinding(element));
        view.addChild(preview);
        view.addOnClickListener(x=> {
            this.selectItem(x);
        });
        if (_.find(this.currentSelectionIds, x=> x == this.nodeKey(element))) {
            view.addClass("selected")
            this._selected = view;
        }
        
        this.getTreeModel().registerViews(element, view, null);        
        return view;
    }
    
    setSelection(element: T): boolean {
        if (this.ui()) {
            var node = this.treeModel.get(element);
            if (node == null) return false;
            this.selectItem(node.view);
            return true;
        }
        else {
            this.setSelectionInternal([element]);
            return true;
        }
    }
    
    private multipleSelect: boolean = false;

    setMultipleSelect(ms: boolean) {
        this.multipleSelect = ms
    }
    
    isMultipleSelect() {
        return this.multipleSelect;
    }

    selectedComponents: BasicComponent<any>[] = [];

    protected unselectItem(x : BasicComponent<any>) {
        if (this._selected == null) {
            return;
        } else if (this.multipleSelect) {
            if (this.selectedComponents.indexOf(x) != -1) {
                x.removeClass("selected");                
                this.selectedComponents = this.selectedComponents.filter(y=> y != x);
                this.setSelectionInternal(this.selectedComponents.map(x=> x.getBinding().get()));
            }
        } else {
            if (this._selected == x) {
                this._selected.removeClass("selected");
                this.setSelectionInternal([]);
            }            
            
        }
    }

    protected selectItem(x: BasicComponent<any>) {
        if (this.multipleSelect) {
            if (this.selectedComponents.indexOf(x) != -1) this.unselectItem(x);
            else {
                x.addClass("selected")
                this.selectedComponents.push(x);
                this.tryScrollToSelected();
                this.setSelectionInternal(this.selectedComponents.map(x=> x.getBinding().get()))
            }
    
            
        }
        else {            
            if (this._selected) {
                this._selected.removeClass("selected");
            }
            x.addClass("selected")
            this._selected = x;
            this.tryScrollToSelected();
            
            this.setSelectionInternal([x.getBinding().get()])
        }
    }
}

export interface ObjectToChildren<T>{
    (obj:T):T[]
}

export class DefaultTreeContentProvider<T> implements ITreeContentProvider<T,T>{

    hasChildren(element:any):boolean {
        return this.children(element).length>0;
    }

    constructor(private _objectToChildren:ObjectToChildren<T>) {
    }

    children(element:T):T[] {
        return this._objectToChildren(element);
    }

    elements(model:any):any[] {
        if (model instanceof Array) return model;
        return this.children(model);
    }

    init() {

    }

    

    dispose() {
    }
}


export interface TreePanel<A,T> extends Panel {
    viewer:TreeViewer<A,T>;
}

export function listSection<T>(header:string,icon:Icon,input:T[],renderer:ICellRenderer<T>,addFilter:boolean=false,lf:LabelFunction<T>=null):Panel{
    var resp = section(header, icon);
    var tw = new ListView<T[],T>(new ArrayContentProvider<T>(), renderer);
    if (lf){
        tw.setBasicLabelFunction(lf)
    }
    if (addFilter) {
        resp.addChild(filterField(tw))
    }
    tw.setInput(input)
    resp.addChild(tw);

    return resp;
}


export function list<T>(input:T[],renderer:ICellRenderer<T>|WidgetCreator<T>):ListView<T[],T>{
    var rend=(typeof renderer =="function")?new SimpleRenderer(<WidgetCreator<T>>renderer):<ICellRenderer<T>>renderer;
    var tw = new ListView<T[],T>(new ArrayContentProvider<T>(), rend);
    tw.setInput(input)
    return tw;
}

export interface KeyProvider<T>{
    key(node:T):string
}

export class NodeWithKey{
    
}

export interface HasId{
    id():string
}

export class TreeViewer<A, T> extends ListView<A, T> {
    
    getComparator() {
        var pcmp = super.getComparator();
        if (pcmp == null) return null;
        return (x, y) => pcmp(x, y) && this._tcp.hasChildren(x) == this._tcp.hasChildren(y);
    }
    
    customizePanel(forced: boolean = false) {
        if (!forced && this._panelCustomized === true) return;
        
        this._panelCustomized = true;
        var cpane = this._contentui.ui();
        cpane.onkeydown = e=> this.handleKey(e);
        cpane.classList.add("focusable-panel")
        cpane.classList.add("list-tree");
        cpane.classList.add("has-collapsable-children");
        cpane.tabIndex = -1;
    }

    private _chhNum = 100;
    private _expandedNodes: any[] = []
    
    isExpanded(node: T): boolean {
        var h = this._expandedNodes.indexOf(this.nodeKey(node)) != -1;
        return h;
    }

    getExpanded(): T[] {
        return [].concat(this._expandedNodes);
    }
        
    setSelection(element: T): boolean {
        var res = super.setSelection(element);
        if (res) {
            this.setExpanded(element, true);
            this.tryScrollToSelected();
        }
        return res;
    }
    
    setExpanded(element: T, state: boolean) {
        if (element == null) return;
        var node = this.getTreeModel().get(element);
        if (node == null) return; 
        var view = node.view, parent = node.parent ? node.parent.data : null;
        
        if (state) {
            if (!this.isExpanded(element)) {
                this.setExpanded(parent, state);
                this._expandedNodes.push(this.nodeKey(element));
                
                view.addClass("expanded");
                view.removeClass("collapsed");
            }
        }
        else {
            if (this.isExpanded(element)) {
                var k = this.nodeKey(element);
                this._expandedNodes = this._expandedNodes.filter(y=> y != k);
                
                view.removeClass("expanded");
                view.addClass("collapsed");
            }
        }
    }

    protected wrapChild(element: T, preview: BasicComponent<any>): BasicComponent<any> {
        if (this._tcp.hasChildren(element)) {
            var d = new BasicComponent("div")
            var view = super.wrapChild(element, d);
            view.addClass("list-nested-item")
            d.addClass("list-item")
            d.setStyle("display", "inline")
            d.addChild(preview);
            if (!this.isExpanded(element)) {
                view.addClass("collapsed")
            }

            view.addOnClickListener(x=> {
                if (x.hasClass("collapsed")) {
                    x.removeClass("collapsed")
                    this._expandedNodes.push(this.nodeKey(element));
                }
                else {
                    x.addClass("collapsed")
                    this._expandedNodes = this._expandedNodes.filter(y=> y != this.nodeKey(element));
                }
            })
            var childList = new BasicComponent<HTMLElement>("ul");
            childList.addClass("list-tree");
            view.addChild(childList);
            
            this.getTreeModel().registerViews(element, view, childList);        
            this.smartUpdateContent(element);
            return view;
        } else {
            var view = super.wrapChild(element, preview);
            view.addClass("list-item")
            return view;
        }
    }

    protected unfilteredContent(p: T): T[] {
        if (p) {
            return this._tcp.children(p);
        }
        return super.unfilteredContent(p);
    }

    constructor(private _tcp: ITreeContentProvider<A, T>, protected renderer: ICellRenderer<T>, labelProvider?: LabelFunction<T>) {
        super(_tcp, renderer);
        if (labelProvider) this.setBasicLabelFunction(labelProvider);
    }
    
    tryExpand() {
        var v = this.getSelection()
        v.elements.forEach(e => this.setExpanded(e, true))
    }
    
    tryCollapse() {
        var v = this.getSelection()
        v.elements.forEach(e=> this.setExpanded(e, false))
    }
    
    navigateDown() {
        // var c = this._selected;
        // if (c) {
        //     if (this.isExpanded(c.getBinding().get())) {
        //         var ch: T[] = <T[]>this.getRenderedContent(c.getBinding().get());
        //         if (ch.length > 0) {
        //             this.setSelection(ch[0]);
        //         }
        //     }
        //     else {
        //         var index = this._components.indexOf(this._selected)
        //         if (index != -1) {
        //             if (index < this._components.length - 1) {
        //                 this.setSelection(this._components[index + 1].getBinding().get())
        //             }
        //         }
        //     }
        // }
    }
    
    navigateUp() {
        // var c = this._selected;
        // if (c) {
        //     if ((<any>c).parentModel) {
        //         var ch: T[] = <T[]>this.getRenderedContent((<any>c).parentModel);
        //         var index = ch.indexOf(c.getBinding().get())
        //         if (index == 0) {
        //             this.setSelection((<any>c).parentModel);
        //             return;
        //         }
        //     }
        //     var index = this._components.indexOf(this._selected)
        //     if (index > 0) {
        //         this.setSelection(this._components[index - 1].getBinding().get())
        //     }
        // }
    }

    protected handleKey(e: KeyboardEvent) {
        super.handleKey(e);
        if (e.keyCode == 39) {
            this.tryExpand();
        }
        if (e.keyCode == 37) {
            this.tryCollapse();
        }
    }
    
    handleDataChanged() {
        var oldInput = this.getInput();
        var newInput = this.getBinding().get();
       
        this.setInput(newInput, true);
    }
}

export function h1(text:string):TextElement<any>{
    return new TextElement("h1",text,null)
}
export function h2(text:string,...children:UIComponent[]):TextElement<any>{
    var el=new TextElement("h2",text,null)
    children.forEach(x=>el.addChild(x))
    return el;
}
export function h3(text:string,...children:UIComponent[]):TextElement<any>{
    var el=new TextElement("h3",text,null)
    children.forEach(x=>el.addChild(x))
    return el;
}

export function applyStyling(classes : TextClasses, element : BasicComponent<any>, highlights? : HighLightClasses) {
    if (classes) {
        element.addClass(textClassToString(classes));
    }
    if (highlights) {
        element.addClass(highlightToText(highlights));
    }
};

function getGrammar(id:string){
    return _.find(atom.grammars.getGrammars(),x=>(<any>x).scopeName==id);
}

var count=0;


export class AtomEditorElement extends TextElement<HTMLInputElement>{

    setOnChange(onChange: EventHandler) {
        this._onchange = onChange;
    }
    private _txt: string;

    num:number;
    constructor(text: string|IBinding, private _onchange: EventHandler) {
        super("atom-text-editor", text);
        this._txt = this.getBinding().get();
        this.num=count++;

    }

    private grammar: string;

    setGrammar(id: string) {
        this.grammar = id;
        if (this.ui()) {
            this.innerSetGrammar();
        }
    }

    renderUI(): HTMLInputElement {
        var u:any=super.renderUI();
        var oldUnmount=u.unmountComponent;
        var outer:any=this;

        return u;
    }

    private innerSetGrammar() {
        if (this.grammar) {
            var editor = ((<any>this.ui()).getModel())
            var ag=getGrammar(this.grammar);
            var evH:any=ag;
            var oldListeners:any[]=[].concat(evH.emitter.handlersByEventName["did-update"]);
            editor.setGrammar(ag)
            evH.emitter.handlersByEventName["did-update"]=oldListeners;
        }
    }
    protected mini:boolean=true;

    setMini(mini:boolean){
        this.mini=mini;
    }
    isMini(){
        return this.mini;
    }

    selectAll() {
        (<any>this.ui()).getModel().selectAll(); 
    }
    
    selectNone() {
        (<any>this.ui()).getModel().setSelectedScreenRange([[0, 0], [0, 0]]);
    }

    setPlaceholder(text: string) {
        (<any>this.ui()).getModel().setPlaceholderText(text);
    }
    placeholder() {
        return (<any>this.ui()).getModel().getPlaceholderText();
    }
    
    setSoftWrapped(wrap: boolean) : boolean {
        return (<any>this.ui()).getModel().setSoftWrapped(wrap);
    }
    dispose(){
        if (this._ui) {
            var editor = ((<any>this._ui).getModel())
            editor.emitter.handlersByEventName['did-change'] = [];
            editor.emitter.dispose();
            (<any>this._ui).model=null;
            try {
                (<any>this._ui).component.disposables.dispose();
            } catch (e){
                console.log(e);
            }
        }
        super.dispose();
        this._ui=null;
    }
    

    protected customize(element:HTMLInputElement) {
        {
            element.textContent = this.getText();
            if (this.mini) {
                element.setAttribute("mini", '');
            }
            var vv:any=(<any>atom).views;
            var cfg=(<any>atom).config
            var l=(<any>atom).styles.emitter.handlersByEventName;
            var sadd:any[]=[].concat(l['did-add-style-element']);
            var sremove:any[]=[].concat(l['did-remove-style-element']);
            var schange:any[]=[].concat(l['did-update-style-element']);
            //var cfgCh:any[]=[].concat(cfg.emitter.handlersByEventName['did-change']);

            var buf:any[]=[].concat(vv.documentPollers)
            var editor = ((<any>this.ui()).getModel())
            vv.documentPollers=buf;
            //cfg.emitter.handlersByEventName['did-change']=cfgCh;
            var ch = editor.emitter.handlersByEventName['did-change'];
            var outer = this;
            this.innerSetGrammar();
            editor.emitter.handlersByEventName['did-change'] = [function (x) {
                ch && ch[0] && ch[0](x);
                outer.setAssociatedValue(outer.getValue())
                outer._onchange(outer, outer.getValue());
            }];
        }

        super.customize(element);
    }

    setText(newText: string, handle: boolean = true) {
        if (this.ui()) {
            var editor = ((<any>this.ui()).getModel())
            editor.setText(newText);
        }
        super.setText(newText, handle);
    }

    handleDataChanged() {
        var v=this.getBinding().get();

        this.setText(v?(""+v):"");
        return super.handleDataChanged();
    }

    getValue(){
        return (<any>this.ui()).getModel().getText();
    }
}

export function input(text:string|IBinding,onchange:EventHandler):AtomEditorElement{
    var v= new AtomEditorElement(text,onchange);
    return v;
}

export interface IField<T extends HTMLElement> extends BasicComponent<T>{
    caption():string
    setLabelWidth(w:number);
    setLabelHeight(h:number);    
    setRequired(b:boolean)
}

export function alignComponents(comps: UIComponent[]) {
    var maxL = 0;
    
    comps = comps.filter(x=>(isField(x) && !isCheckBox(x)));
    
    if (comps.length < 1) return;
    comps.forEach(x=> {        
        var label = x.caption();
        if (label != null && label.length > maxL) {
            maxL = label.length;
        }
    });
    comps.forEach(x=> {
        var f: IField<any> = <any>x;
        f.setLabelWidth(maxL);    
        f.setLabelHeight(f.ui().clientHeight);                    
    });
}

function isField(c:UIComponent ){
    if (c instanceof CheckBox){
        return false;
    }
    if(c["caption"]){
        if (typeof c["caption"]=='function'){
            if (c["setLabelWidth"]) {
                if (typeof c["setLabelWidth"]=='function') {
                    return true;
                }
            }
        }
    }
    return false;
}

function isCheckBox(c: UIComponent) {
    return c instanceof CheckBox;
}

export class AbstractWrapEditor<T extends BasicComponent<any>> extends BasicComponent<any>{
    protected _actualField:T

    getBinding(){
        return this._actualField.getBinding();
    }
    setBinding(b:IBinding){
        this._actualField.setBinding(b);
    }

    getActualField():T{
        return this._actualField;
    }

    addFocusListener(e:EventHandler) {
        return this._actualField.addFocusListener(e);
    }

    removeFocusListener(e:EventHandler) {
        return this._actualField.addFocusListener(e);
    }


}

export class DialogField<T extends BasicComponent<any>> extends AbstractWrapEditor<T> implements IField<any>{
    protected _textLabelPanel:Panel;
    protected _textLabel:Label;

    protected _required:boolean=false;
    protected _rlab:Label;

    setRequired(b:boolean) {
        this._required=b;
        if (this._textLabel) {
            if (this._required) {
                if (!this._rlab){
                this._rlab =<any>label("*", null, TextClasses.HIGHLIGHT).pad(3,0);
                this._textLabelPanel.addChild(this._rlab);
                }
                else{
                   this._rlab.setDisplay(true);
                }
            }
            else {
                if (this._rlab){
                    this._rlab.setDisplay(false);
                }
            }
        }
        this.handleLocalChange();
    }

    setLabelWidth(w:number) {
        this._textLabelPanel.setStyle("width",w+"ch")
    }

    setLabelHeight(h: number) {
        this._textLabel.setStyle("margin-top", "6px");
        //this._textLabel.setStyle("margin-bottom", "0px");
    }

    protected selfInit(){
        this._actualField.setStyle("flex","1");
        this.setPercentWidth(100);
        this.setStyle("display", "flex");
        this.addChild(this._textLabelPanel);
        this.addChild(this._actualField);

    }
    public hideLabel(){
        this._textLabelPanel.setStyle("width","0px")
        this._textLabelPanel.setStyle("margin-right","0px")

        this.setStyle("margin-right","0px")
    }

    public makeLabelNextToField() {
        this._textLabelPanel.setStyle("margin-right","0px")
    }

    protected createLabel(caption) {
        this._textLabel=label(this.caption());
        this._textLabelPanel = hc(this._textLabel);
        this._textLabelPanel.addChild(this._textLabel);
        this.setRequired(this._required);
        this._textLabelPanel.setStyle("float", "left");
    }

    constructor(caption:string,l:LayoutType=LayoutType.INLINE_BLOCK){
        super("span",null)
        this.setCaption(caption);
        this.createLabel(caption);
    }


}

export interface Converter<F,T>{
    (v:F):T
}

export class WrapEditor extends AbstractWrapEditor<any>{

    protected selfRender():HTMLDivElement {
        return super.selfRender();
    }

    protected createBinding() {
        return new BasicBinding();
    }

    constructor(){
        super("div")
    }

    setActualField(newField:BasicComponent<any>,conv:Converter<any,any>){
        if (this._actualField!=null&&this._actualField.ui()) {
            var oldUI = this._actualField.ui();
            var oldV=this._actualField.getBinding().get();
            newField.getBinding().set(conv(oldV))
            var node:HTMLElement=this.ui();
            var newUI=newField.ui(); //?newField.ui():newField.renderUI()
            node.replaceChild(newUI,oldUI);
            this.removeChild(this._actualField);
        }
        this._actualField = newField;
        this.addChild(newField);
    }
}

export interface ModeSpec{

    firstOption:BasicComponent<any>
    secondOption:BasicComponent<any>
    valueComesAsSecond:boolean
    firstOptionLabel:string
    secondOptionLabel:string;

    secondValidator:Validator<any>
    firstValidator:Validator<any>

    firstToSecondConverter:Converter<any,any>
    secondToFirstConverter:Converter<any,any>

    firstToOutConverter?:Converter<any,any>
    secondToOutConverter?:Converter<any,any>

}

class TwoDispatchBinding implements IBinding{

    constructor(private f:IBinding,private s:IBinding,private active:IBinding){

    }
    firstConverter:Converter<any,any>
    secondConverter:Converter<any,any>

    get():any {
        var val=this.active.get();
        if(this.active==this.f){
          if (this.firstConverter){
              val=this.firstConverter(val)
          }
        }
        if(this.active==this.s){
            if (this.secondConverter){
                val=this.secondConverter(val)
            }
        }
        return val;
    }

    set(v:any) {
        this.active.set(v);
    }

    addValidator(v:Validator<any>) {

    }

    removeValidator(v:Validator<any>) {
    }

    addStatusListener(s:StatusListener) {
    }

    removeStatusListener(s:StatusListener) {
    }

    status():Status {
        return this.active.status();
    }


    addListener(listener:IBindingListener) {
        this.f.addListener(listener)
        this.s.addListener(listener)
    }

    removeListener(listener:IBindingListener) {
        this.f.removeListener(listener);
        this.s.removeListener(listener);
    }
}


export interface MultiValueController{

    createNewField():BasicComponent<any>
    decompose(v:any):any[]
    compose(v:any[]):any
}

export interface CustomizationController{
    createBasicField():BasicComponent<any>
    createDetailsField():BasicComponent<any>
    isDetailsVisible(basicVlue:any,x:any):boolean
    getBasicPart(x:any):any
    updateDetails(basicValue:any,value:any,details:BasicComponent<any>)
}

export class StuffWithButtons extends Panel{
    plus:BasicComponent<any>
    minus:BasicComponent<any>
    embedded:BasicComponent<any>

    constructor(private host:{_actualField:BasicComponent<any>; containers:StuffWithButtons[]; updateSigns:()=>void;createElementUI:()=>StuffWithButtons}){
        super();
    }

    setPlusVisible(v:boolean){
        if (!v){
            if (this.plus){
                this.plus.setDisplay(false);
            }
        }
        else{
            if (this.plus){
                this.plus.setDisplay(true)
            }
            else {
                this.plus = a("+", x=> {
                    this.host.createElementUI();
                    this.host.updateSigns();

                })
                this.addChild(this.plus);
            }
        }
    }

    setMinusVisible(v:boolean){
        if (!v){
            if (this.minus){
                this.minus.setDisplay(false);
                this.minus=null;
            }
        }
        else{
            if (this.minus){
                this.minus.setDisplay(true)
            }
            else {
                var minus = a("-", x=> {
                    this.host._actualField.removeChild(this)
                    this.host.containers = this.host.containers.filter(x=>x != this);
                    this.host.updateSigns();
                    //now we should
                })
                this.minus=minus;
                this.addChild(minus);
            }
        }
    }
}

export class MultiValueField extends DialogField<Panel>{
    constructor(caption:string,value:any,onChange:EventHandler,private _controller:MultiValueController) {
        super(caption,LayoutType.INLINE_BLOCK);
        this._actualField=new Panel();
        var items=this._controller.decompose(value);
        items.forEach(x=>{
            this.createElementUI(x);
        })
        this.updateSigns();
    }

    private updateSigns() {
        this.containers.forEach(x=>x.setPlusVisible(false))
        if (this.containers.length == 0) {
            this.createElementUI(null);
        }
        this.containers[this.containers.length - 1].setMinusVisible(true)
        this.containers[this.containers.length - 1].setPlusVisible(true)
        if (this.containers.length == 1) {
            this.containers[0].setMinusVisible(false);
        }
        this.getBinding().set(this._controller.compose(this.containers.map(x=>x.embedded.getBinding().get())));
    }
    containers:StuffWithButtons[]=[]

    private createElementUI(v:any) {
        var fld = this._controller.createNewField();
        fld.getBinding().set(v)
        fld.getBinding().addListener(x=>{
            var vl=fld.getBinding().get();
            this.getBinding().set(this._controller.compose(this.containers.map(x=>x.embedded.getBinding().get())));
        })
        var container=new StuffWithButtons(<any>this);
        container.addChild(fld);
        container.embedded=fld;
        container.setMinusVisible(true);
        container.setPlusVisible(true);
        this._actualField.addChild(container);
        this.containers.push(container)
        return container;
    }
}

export class FieldWithCustomization extends DialogField<Panel>{

    private basic:BasicComponent<any>
    private defails:BasicComponent<any>

    constructor(caption:string,value:any,onChange:EventHandler,private _controller:CustomizationController) {
        super(caption,LayoutType.INLINE_BLOCK);
        this._actualField=new Panel();
        this.hideLabel();

        var basic=this._controller.createBasicField();
        this.basic=basic;
        var details=this._controller.createDetailsField();
        this._actualField.addChild(basic);
        this._actualField.addChild(details);
        this.defails=details;
        var basicPart=this._controller.getBasicPart(value);
        basic.getBinding().set(basicPart);
        details.setDisplay(this._controller.isDetailsVisible(basicPart,value))
        basic.getBinding().addListener(x=>{
           var nv=this.getBinding().get();
            var bp=basic.getBinding().get();
            details.setDisplay(this._controller.isDetailsVisible(bp,nv))
            this._controller.updateDetails(bp,nv,details);
        })
    }

    getBinding(){
        return this._binding;
    }

    protected handleDataChanged() {
        var value=this.getBinding().get()
        var bp=this._controller.getBasicPart(value);
        this.basic.getBinding().set(bp);
        this.defails.setDisplay(this._controller.isDetailsVisible(bp,value))
        this._controller.updateDetails(bp,value,this.defails);
        return super.handleDataChanged();
    }
}

export class DialogFieldWithModes extends  DialogField<WrapEditor>{

    ref:TextElement<any>
    isFirst:boolean=false;


    getBinding():any {
        var bnd=new TwoDispatchBinding(this._config.firstOption.getBinding(),this._config.secondOption.getBinding(),this._actualField.getBinding());
        bnd.firstConverter=this._config.firstToOutConverter;
        bnd.secondConverter=this._config.secondToOutConverter;
        return bnd;
    }

    constructor(caption:string,value:string,onChange:EventHandler,private _config:ModeSpec) {
        super(caption,LayoutType.INLINE_BLOCK);
        this._actualField=new WrapEditor();
        var canGo:boolean=false;
        if (_config.firstValidator(value).code!=StatusCode.ERROR){
            this._actualField.setActualField(_config.firstOption,_config.secondToFirstConverter);
            this.isFirst=true;
            canGo=_config.secondValidator(value).code==StatusCode.OK;
        }
        else{
            this._actualField.setActualField(_config.secondOption,_config.firstToSecondConverter);
        }
        this.ref=a(this.isFirst?_config.firstOptionLabel:_config.secondOptionLabel,x=>{
            this.switchMode();
        });
        this.ref.setDisabled(!canGo)
        if (this.isFirst&&_config.valueComesAsSecond){
            value=this._config.secondToFirstConverter(value)
        }
        this.getBinding().set(value);
        this.getBinding().addListener(x=>{
            if (this.isFirst){
                canGo=this._config.secondValidator(x).code==StatusCode.OK;
            }
            else{
                canGo=this._config.firstValidator(x).code==StatusCode.OK;
            }
            this.ref.setDisabled(!canGo)
        })
    }


    switchMode(){
        if (this.isFirst){
            this._actualField.setActualField(this._config.secondOption,this._config.firstToSecondConverter);
            this.isFirst=false;
            this.ref.setText(this._config.secondOptionLabel);
        }
        else{
            this._actualField.setActualField(this._config.firstOption,this._config.secondToFirstConverter);
            this.isFirst=true;
            this.ref.setText(this._config.firstOptionLabel)

        }
    }

    protected selfInit(){
        super.selfInit();
        this.addChild(this.ref);
    }
}

export class TextField extends DialogField<AtomEditorElement> {

    setTabIndex(index: number) {
        this.getActualField().setTabIndex(index);
    }

    constructor(caption: string, value: string | IBinding, onChange: EventHandler, layoutType: LayoutType = LayoutType.INLINE_BLOCK, placeholder?: string) {
        super(caption,layoutType);
        this._actualField=input(<string> value,onChange);        
        if (typeof(value) == 'string') this.getBinding().set(value);
        if (placeholder) this.getActualField().setPlaceholder(placeholder);
        this.getActualField().setSoftWrapped(false);
    }
    dispose(){
        super.dispose();
        this._actualField.dispose();
    }
    customize(element) {
        super.customize(element);
        this.addClass('text-field');
    }
}

export class SelectField extends DialogField<Select> {
    constructor(caption: string, onChange: EventHandler, value?: string, ic?: Icon,options:string[]=[] ,l: LayoutType = LayoutType.INLINE_BLOCK) {
        super(caption,l);
        this._actualField=new Select(caption, onChange, ic);

        this._actualField.setOptions(options)
        this.getBinding().set(value);
    }
    
    setDisabled(disabled: boolean) {
        return this.getActualField().setDisabled(disabled);
    }
}

export class LabelField extends DialogField<Label> {
    constructor(caption: string = '', value: string = '', icon?: Icon, tc?: TextClasses, hl?: HighLightClasses, l: LayoutType = LayoutType.INLINE_BLOCK) {
        super(caption, l);
        this._actualField = new Label(value, icon);
        if (tc || hl) applyStyling(tc, this._actualField, hl);
    }
    
    setText(text: string, handle?: boolean) {
        this.getActualField().setText(text, handle);
    }
    getText() { return this.getActualField().getText(); }
}



export class CustomField extends DialogField<BasicComponent<any>>{
    constructor(caption:string,value:BasicComponent<any>,onChange:EventHandler,l:LayoutType=LayoutType.INLINE_BLOCK) {
        super(caption,l);
        this._actualField=value;
    }
}
export class EnumField extends DialogField<Select>{


    setRequired(b:boolean) {
        super.setRequired(b);
        if (this._actualField) {
            if (!b) {
                this._actualField.setOptions(_.unique(this.options.concat([''])))
            }
            else {
                this._actualField.setOptions(this.options)
            }
        }
    }

    constructor(caption:string,value:string,private options:string[],onChange:EventHandler,l:LayoutType=LayoutType.INLINE_BLOCK) {
        super(caption,l);
        this.createLabel(caption);
        this._actualField=new Select(value,onChange);
        this._actualField.setOptions(options);
        this._actualField.setStyle("margin-bottom","0.75em")
        this._actualField.setValue(value);

    }


}
export function texfField(lbl: string, text: string, onchange: EventHandler): TextField {
    return new TextField(lbl, text, onchange);
}

export enum FieldTypes{
    BOOL,
    STRING,
    NUMBER,
    INTEGER,
    ENUM,
    DATE
}
export interface FieldSpec{
    caption:string
    description:string
    type:FieldTypes
    required:boolean
    defaultValue:string
    realm:string[]
    example:string
}
export function createInputField(spec:FieldSpec,vl:any,onchange:EventHandler=x=>x):IField<any>{
    var res:IField<any>=null;
    if (vl==null){
        vl="";
    }
    switch (spec.type){
        case FieldTypes.BOOL:
            res=<any> new CheckBox("",null,onchange).pad(-10,10);
            break;
        case FieldTypes.STRING:
            res=texfField(spec.caption,""+vl,onchange);
            break;
        case FieldTypes.NUMBER:
        case FieldTypes.INTEGER:

            res= texfField(spec.caption,""+vl,onchange);
            res.getBinding().addValidator(x=>{
                    if (isNaN(x)) {
                        return {code: StatusCode.ERROR, message: spec.caption + " should be a number"}
                    }
                    if (spec.type==FieldTypes.INTEGER){
                        if (x&&x.indexOf(".")!=-1){
                            return {code: StatusCode.ERROR, message: spec.caption + " should be integer"}
                        }
                    }
                    return {code:StatusCode.OK,message:""}
                }
            )
            break;
        case FieldTypes.ENUM:
            res= new EnumField(spec.caption,""+vl,spec.realm,onchange);
            break;
        case FieldTypes.DATE:
            res= texfField(spec.caption,""+vl,onchange);
            break;
        default:
            res= texfField(spec.caption+"(untyped)",""+vl,onchange);
    }
    res.getBinding().set(vl);
    res.setRequired(spec.required)
    if (spec.required){
        res.getBinding().addValidator(x=>(x!=null&&x.length>0)?{code:StatusCode.OK,message:""}:{code:StatusCode.ERROR,message:spec.caption+" is required"})
    }
    return res;
}

export function okStatus(){
    return {code:StatusCode.OK,message:""}
}

export function errorStatus(message:string){
    return {code:StatusCode.ERROR,message:message}
}


export function createSmallTypeScriptEditor(caption:string,value:string,onchange:EventHandler=x=>x){
    var res= texfField(caption,value,onchange);
    res.getActualField().setGrammar("source.ts")
    return res;
}


//export function createField(caption:string,initialValue:any,req:boolean)
export class BasicListanable<E,T> implements IListenable<T>
{
    _listeners:T[]=[]



    addListener(listener:T) {
        this._listeners.push(listener);
    }

    removeListener(listener:T) {
        this._listeners=this._listeners.filter(x=>x!=listener);
    }
    protected fireChange(e:E){
        this._listeners.forEach(x=>this.notify(e,x))
    }

    protected notify(e:E,l:T){
        throw new Error("Not implemented")
    }
}
export interface KnowsFilterLabel{
    filterLabel():string
}

export class BasicFilter extends BasicListanable<PropertyChangeEvent,PropertyChangeListener> implements ViewerFilter<any>{

    _filterPattern:string=""

    setPattern(s:string){
        this._filterPattern=s;
        this.fireChange(new PropertyChangeEvent(this));
    }
    getPatten():string{
        return this._filterPattern;
    }

    accept(viewer:StructuredViewer<any,any>, value:any, parent:any):boolean {
        if (viewer.getBasicLabelFunction()){
            value=viewer.getBasicLabelFunction()(value);
        }
        if (value &&value["filterLabel"]){
            if (typeof value["filterLabel"] =='function'){
                return value["filterLabel"]().indexOf(this._filterPattern)!=-1
            }
        }
        if (this._filterPattern.length>0) {
            try {
                return JSON.stringify(value).indexOf(this._filterPattern) != -1;
            } catch (e) {
                return true;
            }
        }
        return true;
    }

    protected notify(e:PropertyChangeEvent,l:PropertyChangeListener){
      l(e);
    }
}

export interface Predicate<T>{
    (v:T):boolean
}

export class ToggleFilter<T> extends BasicListanable<PropertyChangeEvent,PropertyChangeListener> implements ViewerFilter<T>{
    constructor(func:Predicate<T>){
        super()
        this._func=func;
    }

    private _on:boolean=false
    private _func:Predicate<T>

    setOn(s:boolean){
        this._on=s;
        this.fireChange(new PropertyChangeEvent(this));
    }
    isOn():boolean{
        return this._on;
    }

    accept(viewer:StructuredViewer<any,any>, value:T, parent:any):boolean {
        if (!this._on){
            return true;
        }
        return this._func(value)
    }

    protected notify(e:PropertyChangeEvent,l:PropertyChangeListener){
        l(e);
    }
}

export class Section extends Panel {
    public getHeaderVisible(): boolean {
        return this._headerVisible;
    }

    public setHeaderVisible(value: boolean) {
        this._headerVisible = value;
        if (!value) {
            this.setExpanded(true);
        }
        this.handleLocalChange();
    }

    private _chevron: BasicComponent<any>;

    private _headerVisible: boolean = true;
    constructor(private _header: TextElement<any>, collapsible: boolean) {
        super();
        this.setCollapsible(collapsible);
        _header.setPercentWidth(100)
        _header.addClass("sub-title");
    }
    
    caption() { return this._header.caption(); }

    private _expanded = true;
    isExpanded() {
        return this._expanded;
    }
    getHeader() {
        return this._header;
    }

    getIcon() {
        return this._header.getIcon();
    }

    protected customize(element: HTMLDivElement) {
        if (this._headerVisible) {
            element.appendChild(this._header.ui())
        }
        if (!this._expanded) {
            this.setExpanded(this._expanded);
        }
        super.customize(element);
    }

    _collapseListener: EventHandler
    setCollapsible(c: boolean) {
        if (!c) {
            if (this._chevron) {
                this._header.removeChild(this._chevron);
                this._header.removeOnClickListener(this._collapseListener)
                this._chevron = null;
            }
        }
        else {
            if (!this._chevron) {
                var l = label("", Icon.CHEVRON_RIGHT).setStyle("float", "left");
                this._chevron = l;
                this._header.addChild(l);
                this._collapseListener = x=> {
                    this.setExpanded(!this.isExpanded());
                }
                this._header.addOnClickListener(this._collapseListener)
            }
        }
    }
    
    setExpanded(expanded: boolean) {

        if (this._chevron) {
            this._chevron.setIcon(expanded ? Icon.CHEVRON_DOWN : Icon.CHEVRON_RIGHT)
        }
        this._children.forEach((x, n) => {
            if (x instanceof BasicComponent) {
                (<BasicComponent<any>>x).setDisplay(expanded);
            }
        })
        this._expanded = expanded;
    }

}

export class BasicViewer<M> extends Viewer<M>{

    private renderer:ICellRenderer<M>
    panel=new Panel();
    constructor(renderer:ICellRenderer<M>){
        super("div",null)
        this.renderer=renderer;
    }

    dispose(){
        super.dispose();
    }
    renderUI(): any {
        return this.panel.renderUI();
    }
    public setInput(value: M, refresh: boolean = true) {
        this._model = value;
        var ui=this.renderer.render(value);
        if (this.panel){
            this.panel.clear();
            this.panel.addChild(ui);
            //this.panel.ui().innerHTML=ui.renderUI().innerHTML;
        }
    }
}

export class TabFolder extends Panel{

    constructor() {
        super(LayoutType.BLOCK);
        this._buttons.margin(0, 0, 0, 4);
        super.addChild(this._buttons);
    }

    private _selectedIndex: number = -1;
    private _buttons: BasicComponent<HTMLElement> = vc();
        
    private _tabs: { 
        header: string;
        icon: Icon;
        button: ToggleButton;
        hidden: boolean;
        content: UIComponent;    
    } [] = [];

    add(header: string, icon: Icon, content: UIComponent, extraClass?: string) {
        var len = this._tabs.length;        
        var button = new ToggleButton(header, ButtonSizes.SMALL, ButtonHighlights.NO_HIGHLIGHT, icon, ()=>this.setSelectedIndex(len));

        if(extraClass) {
            button.addClass(extraClass);
        }

        this._tabs.push({
            header: header,
            icon: icon,
            button: button,
            hidden: false,
            content: content
        });
        
        this._buttons.addChild(button);
        if (len == 0)
            this.setSelectedIndex(0);
    }
    tabsCount(){
        return this._tabs.length;
    }
    addChild(childPanel: Panel) {
        this.add(childPanel.caption(), childPanel.getIcon(), childPanel);
    }
        
    replaceChild(newChild: UIComponent, oldChild: UIComponent) {
        super.addChild(newChild, oldChild);
        this.removeChild(oldChild);
    }
    
    get(index: number) {
        if (index < 0 || index > this._tabs.length) return null;
        return {
            header: this._tabs[index].header,
            content: this._tabs[index].content
        };
    }

    private _onselected:{ ():void }

    setOnSelected(f: { (): void }) {
        this._onselected = f;
    }

    selectedComponent(): UIComponent {
        return this._tabs[this._selectedIndex].content;
    }
    
    toggle(index: number, show: boolean) {
        if (index < 0 || index > this._tabs.length) return;
        
        var tab = this._tabs[index];
        if (!show && index == this._selectedIndex) this.setSelectedIndex(0);
        
        tab.hidden = !show;
        
        tab.button.setDisplay(show);
    }
    
    setSelectedIndex(index: number) {
        while (this._tabs[index].hidden) index ++;
        if (index < 0 || index > this._tabs.length || index == this._selectedIndex) return;
        
        var newTab = this._tabs[index];
        newTab.button.setSelected(true);
        
        if (this._selectedIndex >= 0) {
            var oldTab = this._tabs[this._selectedIndex];
            oldTab.button.setSelected(false);            
            this.replaceChild(newTab.content, oldTab.content);
        } else {
            super.addChild(newTab.content);
        }
        if (newTab.content instanceof BasicComponent)
            (<BasicComponent<any>>newTab.content).margin(0, 0, 4, 4);
        this._selectedIndex = index;
        
        if (this._onselected) {
            this._onselected();
        }
    }
}

export interface Convertor<T,R>{
    (v:T):R
}

export function label(text: string, ic: Icon = null, tc: TextClasses = null, th: HighLightClasses = null): TextElement<any> {
    var v = new TextElement("label", text, ic);
    applyStyling(tc, v, th);
    return v;
}

export function html(text:string):InlineHTMLElement{
    var v= new InlineHTMLElement("span",text);
    return v;
}

export function a(text:string,e:EventHandler, ic:Icon=null,tc:TextClasses=null,th:HighLightClasses=null):TextElement<any>{
    var v= new TextElement("a",text,ic);
    v.addOnClickListener(e);
    applyStyling(tc, v, th);
    return v;
}

export function checkBox(caption: string, h: EventHandler = x=> { }) {
    return new CheckBox(caption, null, h)
}

export function select(caption: string) {
    return new Select(caption, x=>x)
}

export function button(txt: string, _size: ButtonSizes = ButtonSizes.NORMAL,
                       _highlight: ButtonHighlights = ButtonHighlights.NO_HIGHLIGHT,
                       _icon: Icon = null, onClick: EventHandler = null) {
    return new Button(txt, _size, _highlight, _icon, onClick);
}

export function buttonSimple(txt: string, onClick: EventHandler = null,
                             _icon: Icon = null) {
    return new Button(txt, ButtonSizes.NORMAL,
        ButtonHighlights.NO_HIGHLIGHT, _icon, onClick);
}

export function toggle(txt: string, _size: ButtonSizes = ButtonSizes.NORMAL,
                       _highlight: ButtonHighlights = ButtonHighlights.NO_HIGHLIGHT,
                       _icon: Icon = null, onClick: EventHandler = null) {
    return new ToggleButton(txt, _size, _highlight, _icon, onClick);
}

export function renderer<T>(v: WidgetCreator<T>): ICellRenderer<T> {
    return new SimpleRenderer(v);
}

export function treeViewer<T>(childFunc: ObjectToChildren<T>, renderer: ICellRenderer<T>, labelProvider?: LabelFunction<T>): TreeViewer<T, T> {
    return new TreeViewer<T, T>(new DefaultTreeContentProvider(childFunc), renderer, labelProvider);
}

export function treeViewerSection<T>(header: string, icon: Icon, input: T, childFunc: ObjectToChildren<T>, renderer: ICellRenderer<T>): TreePanel<T, T> {
    var resp: TreePanel<T, T> = <any>section(header, icon);

    var tw = treeViewer(childFunc, renderer);

    tw.renderUI();

    tw.setInput(input);
    resp.addChild(filterField(tw));
    resp.viewer = tw;
    resp.addChild(tw);
    return resp;
}

export function filterField(viewer: StructuredViewer<any, any>) {
    var flt = new BasicFilter();
    var t = new TextField("Filter:", "", x=> {
        flt.setPattern((<AtomEditorElement>x).getValue());
    }, LayoutType.INLINE_BLOCK)
    t.setStyle("margin-bottom", "5px")
    viewer.addViewerFilter(flt);
    return t;
}

export function toggleFilter<T>(viewer: StructuredViewer<any, T>, icon: Icon, pred: Predicate<T>, on: boolean = false, desc: string = "") {
    var flt = new ToggleFilter(pred);
    var t = toggle("", ButtonSizes.EXTRA_SMALL, ButtonHighlights.NO_HIGHLIGHT, icon, x=> {
        flt.setOn(!flt.isOn())
    })
    t.setSelected(on)
    flt.setOn(on)
    viewer.addViewerFilter(flt);
    return t;
}


export function section(text: string, ic: Icon = null, collapsable: boolean = true, colapsed: boolean = false, ...children: UIComponent[]): Section {
    var textElement = new TextElement("h2", text, ic);
    var newSection = new Section(textElement, collapsable);

    children.filter(x=>x != null).forEach(x=> newSection.addChild(x));

    newSection.setExpanded(!colapsed);
    return newSection;
}


export function masterDetailsPanel<T, R>(selectionProvider: SelectionViewer<T>, viewer: Viewer<R>, convert: Convertor<T, R> = null, horizontal: boolean = false): Panel {
    var panel = horizontal ? hc(selectionProvider, viewer) : vc(selectionProvider, viewer);
    masterDetails(selectionProvider, viewer, convert)
    return panel;
}

export function hcTight(...children: UIComponent[]) {
    var panel = new Panel(LayoutType.INLINE_BLOCK_TIGHT);
    children.forEach(x=> panel.addChild(x));
    return panel;
}
export function hc(...children: UIComponent[]) {
    var panel = new Panel(LayoutType.INLINE_BLOCK);
    children.forEach(x=> panel.addChild(x));
    return panel;
}
export function vc(...children: UIComponent[]) {
    var panel = new Panel(LayoutType.BLOCK);
    children.forEach(x=> panel.addChild(x));
    return panel;
}

export function li(...children: UIComponent[]) {
    var panel = new Panel(LayoutType.BLOCK);
    panel.setTagName("li");
    children.forEach(x=> panel.addChild(x));
    return panel;
}

export function masterDetails<R, T>(selectionProvider: SelectionProvider<T>, viewer: Viewer<R>, convert: Convertor<T, R> = null) {
    selectionProvider.addSelectionListener({
        selectionChanged(e: SelectionChangedEvent<T>) {
            if (!e.selection.isEmpty()) {
                var val = e.selection.elements[0];
                if (convert) {
                    var vl = convert(val);
                    viewer.setInput(vl);
                }
                else {
                    viewer.setInput(<any>val);
                }
            }
            else {
                 viewer.setInput(null);
            }
        }
    });
}
declare var atom:{workspace:any, grammars: any, tooltips:any}
/**
 * function to show dialog prompt
 * @param name
 * @param callBack
 * @param initialValue
 */
export function prompt (name:string, callBack : (newValue:string)=>void, initialValue?:string): void {

    var pane = null;
    var sectionC=section(name,Icon.BOOK,false,false)
    var textValue = initialValue

    sectionC.addChild(new AtomEditorElement(initialValue, x=>textValue = x.getBinding().get()))

    var buttonBar=hc().setPercentWidth(100).setStyle("display","flex");
    buttonBar.addChild(label("",null,null,null).setStyle("flex","1"))

    buttonBar.addChild(button(
        "Cancel",
        ButtonSizes.NORMAL,
        ButtonHighlights.NO_HIGHLIGHT,
        Icon.NONE,
        x=>{pane.destroy()}
    ).margin(10,10));

    var okButton = button(
        "Submit",
        ButtonSizes.NORMAL,
        ButtonHighlights.SUCCESS,
        Icon.NONE,
        x=>{
            pane.destroy()
            callBack(textValue)
        }
    )
    buttonBar.addChild(okButton);
    sectionC.addChild(buttonBar);

    pane =atom.workspace.addModalPanel( { item: sectionC.renderUI() });
}
export import fdUtils=require("./fileDialogUtils")


