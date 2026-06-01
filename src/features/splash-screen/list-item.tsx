import clsx from "clsx";

import { Border } from "./border";

export function List({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <ul role="list" className={clsx("text-base text-white", className)}>
        {children}
      </ul>
    </>
  );
}

export function ListItem({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <li className="group mt-10 first:mt-0">
      <Border className="pt-10" invert>
        {children}
      </Border>
    </li>
  );
}
