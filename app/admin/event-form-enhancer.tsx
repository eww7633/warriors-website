"use client";

import { useEffect } from "react";

function textFromSelected(select: HTMLSelectElement | null) {
  if (!select || select.selectedIndex < 0) return "";
  return (select.options[select.selectedIndex]?.textContent || "").trim().toLowerCase();
}

function inferType(form: HTMLFormElement) {
  const preset = (form.querySelector('select[name="eventTypePreset"]') as HTMLSelectElement | null)?.value
    ?.trim()
    .toLowerCase();
  const typeLabel = textFromSelected(
    form.querySelector('select[name="eventTypeId"]') as HTMLSelectElement | null
  );
  const source = `${preset || ""} ${typeLabel}`.trim();
  const dvhl = source.includes("dvhl");
  const onIce =
    source.includes("practice") ||
    source.includes("scrimmage") ||
    source.includes("game") ||
    source.includes("tournament") ||
    source.includes("hockey") ||
    dvhl;
  return { onIce, dvhl };
}

function setGroupVisible(root: ParentNode, selector: string, visible: boolean) {
  const nodes = root.querySelectorAll(selector);
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue;
    node.hidden = !visible;
    const controls = node.querySelectorAll("input, select, textarea");
    for (const control of controls) {
      if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement
      ) {
        control.disabled = !visible;
      }
    }
  }
}

function applyRules(form: HTMLFormElement) {
  const { onIce, dvhl } = inferType(form);
  const signup = form.querySelector('select[name="signupMode"]') as HTMLSelectElement | null;

  if (signup) {
    if (!onIce || dvhl) {
      signup.value = "straight_rsvp";
    }
  }

  setGroupVisible(form, "[data-onice-only='1']", onIce && !dvhl);
  setGroupVisible(form, "[data-interest-only='1']", onIce && !dvhl);
  setGroupVisible(form, "[data-guest-only='1']", !dvhl);
}

export default function EventFormEnhancer() {
  useEffect(() => {
    const forms = Array.from(document.querySelectorAll("form[data-event-form='1']")) as HTMLFormElement[];
    const listeners: Array<{ el: HTMLSelectElement; fn: () => void }> = [];

    for (const form of forms) {
      const fn = () => applyRules(form);
      fn();
      const selects = [
        form.querySelector('select[name="eventTypePreset"]') as HTMLSelectElement | null,
        form.querySelector('select[name="eventTypeId"]') as HTMLSelectElement | null
      ].filter(Boolean) as HTMLSelectElement[];
      for (const select of selects) {
        select.addEventListener("change", fn);
        listeners.push({ el: select, fn });
      }
    }

    return () => {
      for (const entry of listeners) {
        entry.el.removeEventListener("change", entry.fn);
      }
    };
  }, []);

  return null;
}

