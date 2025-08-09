import React from "react";

export const ChevronLeftIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12.5 15L7.5 10L12.5 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const EyeIcon = ({ className = "" }: { className?: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M10 4.16667C5.83333 4.16667 2.275 6.75833 1.25 10C2.275 13.2417 5.83333 15.8333 10 15.8333C14.1667 15.8333 17.725 13.2417 18.75 10C17.725 6.75833 14.1667 4.16667 10 4.16667ZM10 13.75C8.15833 13.75 6.66667 12.2583 6.66667 10.4167C6.66667 8.575 8.15833 7.08333 10 7.08333C11.8417 7.08333 13.3333 8.575 13.3333 10.4167C13.3333 12.2583 11.8417 13.75 10 13.75ZM10 8.75C9.08333 8.75 8.33333 9.5 8.33333 10.4167C8.33333 11.3333 9.08333 12.0833 10 12.0833C10.9167 12.0833 11.6667 11.3333 11.6667 10.4167C11.6667 9.5 10.9167 8.75 10 8.75Z"
      fill="currentColor"
    />
  </svg>
);

export const EyeCloseIcon = ({ className = "" }: { className?: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M10 4.16667C5.83333 4.16667 2.275 6.75833 1.25 10C2.275 13.2417 5.83333 15.8333 10 15.8333C14.1667 15.8333 17.725 13.2417 18.75 10C17.725 6.75833 14.1667 4.16667 10 4.16667ZM10 13.75C8.15833 13.75 6.66667 12.2583 6.66667 10.4167C6.66667 8.575 8.15833 7.08333 10 7.08333C11.8417 7.08333 13.3333 8.575 13.3333 10.4167C13.3333 12.2583 11.8417 13.75 10 13.75ZM10 8.75C9.08333 8.75 8.33333 9.5 8.33333 10.4167C8.33333 11.3333 9.08333 12.0833 10 12.0833C10.9167 12.0833 11.6667 11.3333 11.6667 10.4167C11.6667 9.5 10.9167 8.75 10 8.75Z"
      fill="currentColor"
    />
    <path
      d="M3.33333 3.33333L16.6667 16.6667"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
