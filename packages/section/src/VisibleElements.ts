const mutationObserverOptions = { childList: true, subtree: true } as const;

function isChildListRecord(record: MutationRecord) {
  return record.type === "childList";
}

function manageVisibleItems(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    if (entry.isIntersecting === true) {
      VisibleElements.items.add(entry.target as HTMLElement);
    } else {
      VisibleElements.items.delete(entry.target as HTMLElement);
    }
  }
}

export class VisibleElements {
  constructor(filterElements: (element: HTMLElement) => boolean) {
    const intersectionObserver = new IntersectionObserver(manageVisibleItems);

    this.intersectionObserver = intersectionObserver;

    this.mutationObserver = new MutationObserver((mutationRecords) => {
      const childListRecord = mutationRecords.find(isChildListRecord);

      if (childListRecord === undefined) {
        return;
      }

      for (const added of childListRecord.addedNodes) {
        if (added instanceof HTMLElement && filterElements(added)) {
          intersectionObserver.observe(added);
        }
      }

      for (const removed of childListRecord.removedNodes) {
        if (removed instanceof HTMLElement && filterElements(removed)) {
          intersectionObserver.unobserve(removed);
          VisibleElements.items.delete(removed);
        }
      }
    });
  }

  public static items = new Set<HTMLElement>();

  private intersectionObserver: IntersectionObserver;

  private mutationObserver: MutationObserver;

  public startObserving(elementsToObserve: HTMLCollection | Set<Element>, rootToObserve: Element): void {
    for (const element of elementsToObserve) {
      this.intersectionObserver.observe(element);
    }

    this.mutationObserver.observe(rootToObserve, mutationObserverOptions);
  }

  public stopObserving(): void {
    this.intersectionObserver.disconnect();
    this.mutationObserver.disconnect();
    VisibleElements.items.clear();
  }
}
