ГИМНАЗИЯ ДАР — МАТЕРИАЛЫ ПРЕДЛОЖЕНИЯ
Статический сайт для публичного хостинга (GitHub Pages)
====================================================================

Адрес публикации: https://synthdrome404.github.io/dar/
Все ссылки и пути внутри сайта относительные, поэтому папку можно
разместить на любом статическом хостинге и под любым подкаталогом.
Сервер не нужен: только файлы.


ЧТО ВНУТРИ
--------------------------------------------------------------------
index.html            Главная: «Гимназия ДАР — материалы предложения»
app/                  Прототип приложения ДАР.Онлайн (один файл index.html)
  manifest.webmanifest  Манифест для «Добавить на главный экран»
  icons/                Иконки 192 и 512 px
spaces/               Пространства: обзор и шесть страниц
  dining/               Столовая
  ventilation/          Вытяжка и короб
  hall/                 Холл и вход, касса и витрины
  plants/               Растения и кашпо
  handwash/             Рукомойники
  budget/               Расчёт закупок
merch/                Коллекция мерча, 20 предметов
art/                  Живопись Ростова, пять панно (только эскизы)
assets/               Визуализации, фото и логотип
  art/                  Эскизы пяти панно с водяным знаком
css/, js/             Общие стили и скрипты страниц
fonts/                Шрифты Manrope и Prata с лицензиями OFL
.nojekyll             Чтобы GitHub Pages отдавал файлы как есть
README.txt            Этот файл

Папка site/ (сайт гимназии, варианты А и Б) добавляется отдельно.
Пока её нет, ссылка «Сайт гимназии» на главной ведёт на site/ и
откроется после того, как папку положат рядом с app/.


АДРЕСА СТРАНИЦ (после https://synthdrome404.github.io/dar/)
--------------------------------------------------------------------
Главная                         ./
Приложение                      app/
  установка на телефон          app/#install
  родитель / ученик             app/#parent      app/#student
  учитель / администрация       app/#teacher     app/#admin
  магазин мерча в приложении    app/#parent-shop
Сайт (добавляется отдельно)     site/   site/#a   site/#b

Столовая, общий вид             spaces/dining/#dining
  зелёная раздача               spaces/dining/?serving=green#dining
  светлая раздача крупно        spaces/dining/#service-light
  зелёная раздача крупно        spaces/dining/#service-green
  сервировка стола              spaces/dining/#table-setting
  палитры скатертей и стены     spaces/dining/?cloth=wine&wall=green#dining
                                spaces/dining/?cloth=wine&wall=beige#dining
                                spaces/dining/?cloth=linen&wall=green#dining
                                spaces/dining/?cloth=linen&wall=beige#dining
Вытяжка и короб                 spaces/ventilation/#vent
Холл                            spaces/hall/#hall
  обратный вид                  spaces/hall/#hall-reverse-compare
  сценарий ТЕЙП                 spaces/hall/?hall=teyp#hall
  касса и витрины               spaces/hall/#displays
Растения и кашпо                spaces/plants/
Рукомойники                     spaces/handwash/#wash
  вариант А                     spaces/handwash/?wash=a#wash
Расчёт закупок                  spaces/budget/
Все пространства                spaces/
Мерч                            merch/
Живопись Ростова                art/
  отдельные панно               art/#don-embankment   art/#cathedral
                                art/#city-duma        art/#gorky-theatre
                                art/#don-bridge


ЖИВОПИСЬ: ФАЙЛЫ ДЛЯ ПЕЧАТИ
--------------------------------------------------------------------
На сайте нет оригиналов панно и архивов для скачивания. Показаны только
эскизы: 900 × 600 px, JPEG, диагональный водяной знак
«ДАР · эскиз · не для печати». Файлы для печати передаются по запросу.


ПУБЛИКАЦИЯ НА GITHUB PAGES
--------------------------------------------------------------------
1. Положить содержимое этой папки в корень репозитория synthdrome404/dar
   (вместе с файлом .nojekyll) и добавить папку site/.
2. Settings → Pages → Deploy from a branch → main, папка / (root).
3. Через минуту сайт откроется по адресу https://synthdrome404.github.io/dar/
