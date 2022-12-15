import { useRef, useEffect, useMemo, MutableRefObject } from 'react';
import { FastNavigationSection } from 'section';

const elementsMap = new WeakMap<Element, FastNavigationSection>();
const namesMap = new Map<string, FastNavigationSection>();

function createSection(): FastNavigationSection {
    return new FastNavigationSection(elementsMap, namesMap);
}

export function useFastSection<T extends Element>(
    name: string,
): [rootRef: MutableRefObject<T | null>, section: FastNavigationSection] {
    const section = useMemo(createSection, []);
    const sectionRootRef = useRef<T | null>(null);

    useEffect(() => {
        const rootElement = sectionRootRef.current as HTMLElement | null;

        if (rootElement === null) {
            return;
        }

        section.setRoot(rootElement);
        namesMap.set(name, section);
        elementsMap.set(rootElement, section);

        rootElement.addEventListener('keydown', section.onKeyDown);
        rootElement.addEventListener('focus', section.onFocus, true);

        return () => {
            namesMap.delete(name);
            elementsMap.delete(rootElement);

            rootElement.removeEventListener('keydown', section.onKeyDown);
            rootElement.removeEventListener('focus', section.onFocus, true);
        };
    }, [name, section]);

    return useMemo(() => {
        return [sectionRootRef, section];
    }, [section]);
}
