declare class Map<A,B>{

	get(a:A):B
	set(a:A,b:B):A
	delete(a:A):B
}
export class Node<T, V> {
	children: Node<T, V>[];

	constructor(public parent?: Node<T, V>, public data?: T, public view?: V, public container?: V) {
		this.children = [];
	}
	indexOf(predicate: (node: Node<T, V>) => boolean) {
		for (var i = 0; i < this.children.length; i++)
			if (predicate(this.children[i]) == true)
				return i;

		return -1;
	}
	addChild(child: Node<T, V>, index?: number) {
		if (index == null)
			index = this.children.length;
		else if (index < 0 || index > this.children.length)
			throw new Error("IncorrectArgument");

		this.children.splice(index, 0, child);
	}
	removeChild(element?: number | Node<T, V>) {
		if (typeof (element) == "number") {
			var index = <number> element;
			if (index < 0 || index > this.children.length)
				throw new Error("IncorrectArgument");

			this.children.splice(index, 1);
		} else {
			var index = this.indexOf(x => x == element);
			this.removeChild(index);
		}
	}
}

export class TreeModel<T, V> {

	private root: Node<T, V>;

	private flat : Map<T, Node<T, V>>;

	private find(parent: T): Node<T, V> {
		if (parent == null) return this.root;
		return this.flat.get(parent);
	}

	clear() {
		this.root.children = [];
		this.flat = new Map<T, Node<T, V>>();
	}

	insert(element: T, parent: Node<T, V>, neighbour?: Node<T, V>, after: boolean = false) {
		var node = new Node(parent, element);
		if (after)
			this.insertAfter(node, parent, neighbour);
		else
			this.insertBefore(node, parent, neighbour);

		this.flat.set(element, node);
	}

	insertBefore(node: Node<T, V>, parent: Node<T, V>, before?: Node<T, V>) {
		var index = before ? parent.indexOf(x=> x == before) : null;
		parent.addChild(node, index);
	}
	insertAfter(node: Node<T, V>, parent: Node<T, V>, after?: Node<T, V>) {
		var index = after ? parent.indexOf(x=> x == after) : -1;
		parent.addChild(node, index + 1);
	}
	remove(node: Node<T, V>) {
		node.parent.removeChild(node);
	}
	get(element: T, parent?: Node<T, V>) {
		if (parent)
			return parent.children[parent.indexOf(e=> e.data == element)];
		else
			return this.find(element);
	}
	
	constructor(rootComponent: V) {
		this.root = new Node<T, V>();
		this.root.container = rootComponent;
		this.clear();
	}

	registerViews(element: T, view: V, container: V) {
		var node = this.find(element);
		if (!node) throw "RegisterViewException";
		node.container = container;
		node.view = view;
	}

	patch(before: T, after: T) {
		var node = this.find(before);
		if (node) node.data = after;
		this.flat.set(after, node);
		this.flat.delete(before);
	}
}