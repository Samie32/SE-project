// jsdom does not implement the native dialog top layer.
import { configure } from "@testing-library/react";
configure({asyncUtilTimeout:5000});
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
};
