(async () => {
// 由 scripts/build.mjs 生成，请改 js/ 下的源文件后重新构建。
// 每个原模块被包进一个 async IIFE：作用域隔离 + 支持 await，顺序即依赖顺序。

// ---- js/roulette/gen.js
const m_gen = await (async () => {

// 由 scripts/build.mjs 从 data/roulette-chars.json + data/avatars.json 生成，请勿手改。
// face 是 data URI：选人一屏的头像一次传完，页面只发一个脚本请求。
const CHAR_ORDER = ["a-15601","a-15600","a-15591","a-15567","a-95786","a-15570","a-15598","a-15568","a-15576","a-151844","a-77913","a-15580","a-15560","a-94450","a-15569","a-145363","c-dragond","a-15585","a-15588","a-15581","c-samo","a-15565","a-148578","a-54117","a-54116","a-15595","a-15602","a-15571","a-15604","a-15587","a-15584","c-ratking","a-77921","a-15577","a-15599","c-maodie","a-125346","a-130226","a-15596","a-77926","c-zerok","a-15597","a-15563","a-15573","a-15564","a-130901","a-77922","a-15594","a-141302","a-15592","c-banxing","c-xiamolin","a-15566","a-15582","c-mengyi","a-15575","a-15589","c-chaoxing","a-77917","c-alice","a-15562","a-15593","a-15590","a-77923","a-15586","a-15579","a-15603","a-77925","a-15572","a-15583","a-15574","c-baiyun","a-77918"];
const CHARS = {
 "a-15601": {
  "id": "a-15601",
  "n": "24",
  "en": "24",
  "hp": 5,
  "items": [
   "lens",
   "whisper"
  ],
  "passive": {
   "k": "echo",
   "n": "她们",
   "d": "你对自己打出空壳时，从桌上再摸 1 件道具（每局最多 3 次）。",
   "v": 3
  },
  "realm": "混沌",
  "role": "伤害型",
  "line": "嘘——别让她们发现，我手上多了一样东西。",
  "creator": false,
  "face": "data:image/webp;base64,UklGRpoFAABXRUJQVlA4II4FAAAwFgCdASpAAEAAPnEwkkYkoyGhMBv9+JAOCWUAwpmr1UGtRdGHynCw568xvqUG7xFv55u3oAN1HScaAH5w9C3/r8qf0d7AX6y/9LsNfuF7MP7XOej/69H8jUOmtqyPUJ1huzLr2OeDQPJLBFCE4OYRmIMYTMjH44VKjxEIoRUSJTrOt6MIsunvb2hcJNkv+H7mT7D2esr6qgzAI1JatgeEwRZ+8vn0C2kIpuUI6aH1k1d9dkqnOqtB6wAA/v6jCj9FRGiUeDRWFCGQ7q6E5KfwS+H8XdiOLRMRv4d3N12GL+WIfKNAfGvV7MkK5MCI966gXnl9L6zbYOWH1WFDC0ddJSdJioOfm/NV+9y+qGzePMxDi12UfUA1pBcTZ106Cj9iDvfuiGL9p4qnH1WnV/9IlW/2l1wEI0QRk1nl5GVrzpxCjWreXSKC62yYKhGOf3wl7sztZ9GdpFZ9ZYEAdHpH984WXkGe1BPJ92Dw+u+kgyWcZpLL1Czeny+sgnRAjMQo5byvVsV/JFzx1CbtaoJqb0zwZrvkkHsNcfhp30VxYyQt5DHOuDWguTq5gaEkzHuVnKtsfv/6R53pgx4KS3LH74ZEH5hfTXj1EyBOvZsOae5iK45xGl3bZQ6Z0NQd93KTinh1sGE9BM76jZM+CsVfaCW6NMzRbTVqbjtJ+GUvCDLjv6PH2gYW1jhv7+tmmVSBgFcK0mmZYrxj8YmaMdZRws9UbQ62W2VSSKq6Z4DNujnt1BAfdkNgfRPTnn57gXkuvGG4OaLnnns93DQ+/eq26JAFEZAArERKqpINvcQqmS/UHvhCjlfPjXjX+WEeJAyK+WddvfEilKqp0xcjn+o7Pr/oE0U6U/2sRtWK2E/sr3YRx9DakZcgV3nMDGlvHKGsImPKppEg3ETbzcWWqucRrKaJGvxBt9WfW5i5qnhxIJ4SK/FPRTBP+6nZlFMrOKxscDtiXDi7J7K3Vv8LGrytvgLALtJnBqnydje3n7e76V5sQL7CwZ3PFof3Iy2sG391ul3mkHDYXBZPvXHm/NscyiGO0nBtM5MWyVt3xgTxQpSgZ3zB9mjAiNSpTn/ljKkIT7IGFiqZx0rNr2+xTn8BP+ceEpi3owKCd5z/F0lWJTrsNq75JeGoIcjjZIyP0boGWKQG3pV30Dj0UCEzh8Ce2l/oUq544JL21sGF1kv1DVOSCDBFfc+9+1u40sY2vrtf9clAT5wE8ZvIZLRlGNoTjByxC/oeXUY/Sy+ixi5D+vecmLmgRCZZlGxPzTCuJdh/pxvdutS1bYMYKrGUQwP0rW0XzMgHbTW90W4GropLYKdm5eP5F0oXCofxcK6nmq9WoVKbMn8UyZ6ERuAve6S/UF3OpoioZNEsllNcjT4hInW8fy/YEnmUcaaRF1txml5IE4OIvpuJ9YP5QOAoHdOt5gEu+JTSEVeaOLqmlMGW6dF6EiDOf0aYnjZ96dJJVQLOmhCF5+v0dkmnkJ7hyFS/xVJGHXCeyt0jAVDJx7jU+b9ycdCt9Ap267auXVakMjDEdwaShwhRzW5cBshsFrhxp3a/1WeLqc7ladR0bsA3IFx0H5HM75eTF26W0nySr0fvHd7Ezu0Eest7Gj730PNbK7/pBasPZ0c03IteLn8RjhmAWn0TWfOAvu8num8yJcif5ckF2AweZfJiVJoTuMhT2Sjas42pkVuORWX27BD2VK71mTwY086dSRBKoIeu5VUOTnDbwnbMLNvMDsRHKemhRjEo7j7Pv3gfvmW2iC4myopWTHYDqiozBp53yBINrhkv13HzpcbdLsVPBRqWfiUB06rrDucRPdNs7TwNUt+Z/PwLjmYmMnRptETzQDjiJEYfJYdPoMZ+8hfxKe/U2ZdTUtY6yWoj0WgrMxboAAA="
 },
 "a-15600": {
  "id": "a-15600",
  "n": "阿格里帕",
  "en": "Agrippa",
  "hp": 5,
  "items": [
   "scroll",
   "lens"
  ],
  "passive": {
   "k": "aim",
   "n": "命轮演算",
   "d": "每局开局看清第一颗；每局一次的实弹若正是你亲手看清的那一颗，伤害 +1。",
   "v": 1
  },
  "realm": "血肉",
  "role": "防御型",
  "line": "这一颗我算过了，你们不用猜。",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15591": {
  "id": "a-15591",
  "n": "艾继丝",
  "en": "Aigis",
  "hp": 5,
  "items": [
   "aegis"
  ],
  "passive": {
   "k": "armor",
   "n": "自律装甲",
   "d": "每局开局自动获得 2 层护盾。",
   "v": 2
  },
  "realm": "血肉",
  "role": "辅助型",
  "line": "外壳还在，就还能再挨一下。",
  "creator": false,
  "face": "data:image/webp;base64,UklGRnIGAABXRUJQVlA4IGYGAAAQGACdASpAAEAAPmkkjEYkIiEhOf2AgA0JYgCdMz3MMZKInV0Zhju8+8+AvjN+GRgzgvqoGgSAfkHddwAfWHiN0n2gB+j/Q2zpPUP7J/AN+tf/X9b32Sfst7Lv69DgOehJsyt9S2le0DKA9pVFvHz/f0Md9vjc04Yd3FZ/m0UI3341jYzgXsdDGPcis+PrYhCUWwb5gLGrvbs1xVOfptU6up252szc8dyP3DksqB3ERpXfr5+X02xXq6HbFdM+QRPfqZfKd8MSbTAA/u0PCJg6aIzcVuDXw+mjHP7f5hnrt7hFes7iA21YC/N0YDRztbxXIHogmjSkl2DMSAq2mVQyJgkCkd08CQfZTyxZDkGDWpRRWytWE6F7RVlDABReYPzB0Uf4yZq1pxcP9SjFe0RfI3lQIOtkDx/eHKUjgxZPAtaSpyRoHz5j5EYrS6qXz2q/QbuecHtZ94jhftCrKkMRk2w3lLx7h+vSn+qLrSQn7t7s3Z+Bvq4nbNTorFv9GNp0JsAoffJN5Uiz+GQ5xVvM3VTCwgqHGbtbH8jCG8ZJqBZ1KtTxPRurL/4FeO6dystCQUJsmVuaCwVoLyq7e+p+LLy3hfgG4CSm/TyADO4pL/EOODb0SBgDIxP/DBSwQqrTa1BCqcKr8AK1CK/BiZKlI8XCg3LouormAoxT0wIE2y6Aa45yG+2k5UuReJw+/zS4OSXXLr+kM+MdkJQnj+12jL7Fj5txuXWMcfwmheJcBxSzsmA/qbRg09ot1yesXE6BG7S7OkB0xKWtcuFKHPZXnDbmGgd0PHfq4yFga/f4P6ARDHLIylaG98CDp6z7oIdJndY6l1xve0FGptRODrI9ZEGqXsI791ulSDuf6kwjOcgU9fVHzqkC7qIysTvK5p3066dI1fnaRaXrHTsxWXUe4jGQIcYhSY6uE3d+GvmHtsJPvxIV2pfUpFlSPJUDaJ406ulriZHWVj08JY32fgRpKGEp3QFj04Su76dPawlRSXhDEb6Mp7i1ollL+8Jp89xBrFbESQgXPAaATNHxbMV9xiPrQ4pviQ59pEF6arCAAWA7ovy98P8ALu3cuhApFJKqmHb/5pSgq11hYQfp0YycDCSjn05vIAjDNwZqp5tJEgM0Fl7Q9e8STmg7h16003IC38Uhr+5UVmd0n+jKD4iEtPG1vMQqul9wp4eNd1RjBKMWCAD059KMLsJ0L83XU3Gz81iRd5DO4B/ne9Fl5/4Q4WnGaUgrL5rsj2E3X7NzQWtMvJhgrZ0oD4uaVest+CO7qnKabTsQYbPvFbcwq+BvnfPn6NXJMf0eETcBKmbpTAKm/cNdTuufdI4Ha+qtCjGdfoUis3Ahg/tLaEZRliIj4Hw453pSqnFQ8qUBrgcbwx193XMTXKy9aJIB4SrCkWmaUvDaVACYKawFk0V0tZZhDCLUtni7oZVUOo8HWAS9BkJK66TUY05uSEp0Uo2+K3BRf37Yp8apTLOPSDGhHQS7Hdx57VSR0oAipIK5iNrEQcUK5oibhEnK+WSH/oX8eKCAAQ/Qk3+PYEPEe5FHI6nuXpDnNufXFlBb+HWOW7za9SVAj2Z5vrIt31PY1x/WlydrFlOahMfoZAMQ029XmjPFMoDpQU9ou7A+UsWfwaoXdN0UI0kqcS82T7D+UiNrkW5vZ1ylSqhMjs5v6Qb33weLb2H1GfUEBzSucLaigca8Tdfb8vINIen2OFS0wlEDmRNoKfx779XrswHA7nUsgNHTj3xerL8GEcy0m27rom2POkwa9Ys5zgTMSH+9NLWKTibaiIjQMLb+/mtlWqgK/RBdv/DfzReTt/YE8JWO/SEOFvGxmFmVs21UdKAM0YfsYg9Wa9gD6unfoBhpltNvzFLJb71j+nX/2AFRuvnZyJ6380vJSQaMxuoACrSza1j+AZG3HxcRCyWM58SlBLpjgfHP9kZq8Ld14YMeFEJxxZSO2CDgzPUa1P0yXXnE7WJpruaT7gx82VW9KEROr8Ha+Z7B+6WGfHWvzotOHbPrFPimHPzLd3mJ1DGuZa+/IXhI0RBGAZptZPPcAO95nw9Vkw4BaU4et2Yxru2HQvbfQexPiiT2dIwezRUXUXga021hd914n71kcgbctB48YUtoin8bPDZGGaWiqf4bqTizj5T8m5Oj7hyeinwIx+XyTPSDnALHKNMcAAA="
 },
 "a-15567": {
  "id": "a-15567",
  "n": "血链·希洛",
  "en": "Helot: Catena",
  "hp": 5,
  "items": [
   "chain"
  ],
  "passive": {
   "k": "lifesteal",
   "n": "嗜血链",
   "d": "对对手造成实弹伤害后回复 1 点理智（每局最多 2 次）。",
   "v": 2
  },
  "realm": "血肉",
  "role": "伤害型",
  "line": "你流的，正好是我的。",
  "creator": false,
  "face": "data:image/webp;base64,UklGRrQGAABXRUJQVlA4IKgGAADwGACdASpAAEAAPmUkjEYkIiEhO/tggAyJYwC0aFAE3bOWAm8v7N4C+M34Hm24F+oLUC7T8Su8ngBOq7QLu52FHqB9g9Yi8o9gD9Fehn/1eVz6b/Z34Bf149Mz2M/tb7Mn7RkoEOICEDez6Yg9IHkYKaywc/aXF0PJ6Di1qWpQL8VvVckc3HtGzkctcyCH/gjWHTMEgWYikwWqqEHPZT8IaLBShKNHMS2QBpK82aAoy25taRmqVepZhSItiPPWF5OWnFsDtP3JY0VE457s5ApQAP70Nm+ay5RhhYiRBFYz0DIitKxXfXm2or3KSwLtToU+Y4T9nEnpn3buUKmzut4ME3tlP5BXFaVBhZbkpjctwdbPEDk3iVlz2+PQWkxv2Xr9o1pXm4S7H3+7HguZnDkQHyTeDdU1tCe/4FBXd4dZOrhisYHLzTP/ml0/laPyUWxUPcqfcgn2TgeGalNL4hAB2+8vvA1DXeUCESCJFdvCVi4/hyz/ZOJ0bewu7Z2LNBnrcPH/SC2voO8PvQsHII5x/C7/eyzaxbnzRtWZQUqrVW/yihQRr6lhTszS5IDXsd+VTtTm5s6hxpX0uLV1ojAzD9h+GY8CEBX+5hk89Bw5nDYe37DGN+yo1OgEtSGxIYlYhpoBR5cbu2fMu+6eACCk5RSU2GqJg8J0zzfD15aLL0sA0kxOedl9orkfD/AHwK1C/ES0eOEsSP4ic8tcMbHPQ2Yqn5OttMclqUWWXQwan2asufq8QapPyPOkgQuCfrfOVuJk8VeuaVSau3WBl24hzUKOaNmq4U5sKA0vllfXR3Pf90auOkwGrOAQnuyD60fnHAy+VoMd/GT7N+gNtkKnVx9WwYeWebVCWDHxRocPG+22PeNxf2BkLJ6occXkJJzJ61Mrd0ZPg8MuF9w7HM+it7A5TtWe75FUOPuumCMBx25LodKibzR6sg2Y5ucw1GGg1H5mPw/Z+Cj1pudMUE2/9nHC2WectPwhp4S67+OL3Mzl+7A/2+Pm4qnNGqsvOgqh2hHyVBXOSJ8Wq9kfBpeFE+SI3mL37Y40E3IdyUzeztChYxyFdqMtQIG1LeH3YqfVcO8+LeafbAiR+ANJBaNUZhfUR5gDZb/F5sFnyW8IkGUDTSQlAV5JOGYPK4iLXU1YtIjSQnfTwFzZwk6UYixw0PrRl82aX/dZAmjdGnAjveKYHKZszVb+3rc93xIbiIcoV3PuE4twbSBB3xGopA/r3XpatRcIcd4jjWTj3F1Nn7QflXnW5XaWX2xsromV9XJyFER6AXJ7cnM3ErF/eAHuVBroZjwLzEw1KIx4eUXxeca6ZA5f2enXubCbdOTEfq0Dd8shCsmrwfyQlyyDmPcL/LBgqhiTV3g1Vt146KArYbmVgr9zAO+d17OEXHkQiGiVxZFxG4oPUm6N75yhi2z8/0nmeN8qaZ6F/ctEw/YI5Av5C9anFy5Wsu23TlcgKoiotynBrTmdIUQnpMnGr3PdfxGEaUkF36TsOfJrP1345gRsKVB0K1kN5t5RlzKgIy/KDz1NaVUrcOaDNMNy5AiutPonoKwYB++EVcdGUsGXV5Lsh5oe18RCKyLQNSpLeThwsVSXBrautRZ3vemGP7W7a7lQYdLab5qVJzb6FV0dGNwUL5y8ry/PlqUs6rwdh8L3Z6KwJ1Q7pv1szrZ5jek5n5Ym4sL68eR3OUZiZsv3l7lQUKgz47Di+MwXI5HiuSEa6jBzcZ0uTXLZ8od/1LWBzd0pPHvStryfs2nadSduuLi2f4vCWyudLQ2s6PBObtafm8K6Js83em6LO3ilMVh8De3goojm3fHY6n+Fc++prdFs1xFrxCq4nYtXNzwT6nwEBqnpEvrqFyLozX7hzKrz2v7/HILXtNIt3/jgLf5V/+aL6E0Ube/wsK+Lb7Pslmr/4NdSdbFpNtoqmfZif+RzmHdExr+XV/kvszeoaANcJLzgWD51/EII1BXGd/LlFdlWuLVdt6NVtT1/3L3eV/b1x+88nPzhnbIcD4QyjDEAi7jgWeKLI16qHvKLl1b5XNT8L0+Bb3PrSX+Vy4dP4nBjJFfzKf0O35fwd8PMKQ5mwKbyB1IZSG2MgXWhMDaYfmNrUvCe7z8kjLUKOOHq1DTdS9fEzDesDzumnTCQV6azjryjcSO5CP3dph4qxOZGWFRk4k+EE1PhkEnYXThK2g4z4MTvVtu8mKrTUQbPnJQd1xzXWbhvJ51B5rSDQE1qgEVCYWllds5T8ZmddDA1A/ACRbdPFOMnAAA="
 },
 "a-95786": {
  "id": "a-95786",
  "n": "杜勒赛因",
  "en": "Doresain",
  "hp": 6,
  "items": [
   "cuff",
   "lens"
  ],
  "passive": {
   "k": "greed",
   "n": "王的凝视",
   "d": "对手每局少拿 1 件道具——桌上东西都归王先挑。"
  },
  "realm": "血肉",
  "role": "伤害型",
  "line": "坐下。这一局，你只需要看着我。",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15570": {
  "id": "a-15570",
  "n": "朵尔",
  "en": "Doll",
  "hp": 5,
  "items": [
   "needle",
   "lens"
  ],
  "passive": {
   "k": "extra",
   "n": "破布之躯",
   "d": "每局多拿 1 件道具。"
  },
  "realm": "混沌",
  "role": "辅助型",
  "line": "缝得上的都算我的，缝不上的……也算。",
  "creator": false,
  "face": "data:image/webp;base64,UklGRloFAABXRUJQVlA4IE4FAACQFQCdASpAAEAAPnkuk0akoiGhMfVdsJAPCWUAvJwlSGhG/ZHen5dQHxm5uctLSX/M/Pp6JGdx6h9gT9bv+d64Xsi/ar2Zv2qVhz0R8UFucjDAXaTitgjD1N4nWWl5boNiqgaZqwDg/jjQpl30nCpb+b7ItGGZjPd1iqXTbri08HmA4RabedLJ1mxVraUTl0wopfiBljyBgFAPtBA7FojoIwcoyhnZJjEgKNt7bgJ/munLiT48AP7mCwYf25I7gthyLe+C/z+Ql6Zx3Y9GWzCyPIovam3DlPukQtGnZVGyH8xNSuzBpK0Ms+3UiEWwNadjI6ZVNT4hZesrkqfwSJwttkYwpF2Ka90hqeOvvAvMgvvXJfCTAcf/0aUG1nhAyZoLyHQN/YZN4sjqlNJyN12oUKPuumyrU4vZm5yvdap5lrnz552zo8GnKhHJx7psDje3/pmOSTKM9oHA1fQ944DE/9mQ7E/fSHlR18Sr8pKmHEFz7/7G8fa5rw21Ld93mDD3R+QoWqtumcOA4hL6bRwqnXai0vIgZmAOmi/VLm7xe3X2v3AxNs6DzEPxKjcNyHZlIi6JdwIKlb/NXcH9/T5iRr568C2OFNTAbwKnpt10ysLXOi1ouCCxLno1loUwAYpa+lBuJkTDOQEdbof2XqZ/KfddhWiIapxcjVrGQkze8UF1WwrW3+aYnZQz0E+iS7Xvh0eWPFTx7vSxHdTXCDey9xwcRqqlCz6ye4M4eJO2Cew5q9ewbTDqaqzQNT7f+JpmC9CdzLxLnWJoNGHDDmScNvzgOM/wDW1CY4+mUnAOAWK19Wzdnv/A/JWe0P2G92A638VG6PnJR+e3xadDSIQcPYCO1P+JVlgq8LFXyViyYLI+Non0IIns134Dccyda5E6ayb5n+9TjxJMeU5W0cnuRI46TY5ZDBSzjwYPwn4t4sGzbQ9+2Zt1YrfD/OeYsi53l1OQbGXIV9B2Po6FrjxnBaxMJzb2MhrxGrYEIsA8oUpyBDs6q4EMmn13FLd2dsKgIHAzcY2HyhpNKySZa9077pccVi8OeX2aaPPznXWKeoXPE4ASDpEFq7uqciKFT6UBeILNRlp+sZieg8QHik+WXVYb0mLq40hyvYZa3NwWl7nu163dL8rkowR/GiR9A31MKmzeK1H8lry7k0ruMkErv5WxM/UZJ91vLKEvpGU6s9vHz0AiHczndTZh7hZB5iPcfzLoaMo3Z/wkpQTwxYJMdAtUzyYvzvLrXE8qfEpns7dqT5rz/x/ZamlKaBw+BtKZCwCAdET+TLNjP1TlOFGZ0gqi+mmLfAnyRZXFEAYVJwXWkM9L5gDkW1SvPtTbJhc1vLFULaIecw2af3XpwPLIHq7rFq/Ms1fDYN7Ku880vbMbYsdx7zGI+++gqxrk8SDzAhcrnXWmpycJTM/Et9erzJaD1AYWT9az4Oq36Bu20JqO0dLARqSMcUql4wmy33j1csJizjgPWcjDhTbe/rkqe4MaAzFkXF1C3yhGPlt42+Ztc53wsYCjcHbok9v52AmbwFRtFztx20n/DdAJTXty6rqZ9jIfyjOYTDB1oPW6GcDlYGdibppc9YcnjHKvWSqsfPxUoZg6xG/eUO+D1+dtAxOdwrmOWlg7wxTQI5JHutaxWYKtwIqWRRIcE12EE7QbVQV5gnu/BDhfn6loMEUu8jKn+hloXSXue8YSrFlBczmT2SAlvG78K6DAkiX5iIDXiN+KAhUMF706/lsTNpJ6Ef0lEwgiLDhUA2+NiL7vthSlO+nq/j7TfI8m25DABx/qrK86bukxLJyanQAAAA=="
 },
 "a-15598": {
  "id": "a-15598",
  "n": "尤乌哈希",
  "en": "Uvhash",
  "hp": 5,
  "items": [
   "saw",
   "saw",
   "lens"
  ],
  "passive": {
   "k": "serrate",
   "n": "锯齿",
   "d": "每局第一把锯是 +2 伤害（锯齿），第二把退回普通的 +1。",
   "v": 1
  },
  "realm": "血肉",
  "role": "伤害型",
  "line": "两把锯，够把这一局锯开。",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15568": {
  "id": "a-15568",
  "n": "环行·拉蒙娜",
  "en": "Ramona: Timeworn",
  "hp": 5,
  "items": [
   "hourglass",
   "lens"
  ],
  "passive": {
   "k": "revive",
   "n": "回环",
   "d": "整场一次：理智归零时回到 2 点，这一局接着打。"
  },
  "realm": "混沌",
  "role": "辅助型",
  "line": "这一段我走过。往回走一点，也还是我走过的。",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15576": {
  "id": "a-15576",
  "n": "墨菲",
  "en": "Murphy",
  "hp": 4,
  "items": [
   "coin",
   "pill"
  ],
  "passive": {
   "k": "lucky",
   "n": "赌徒之运",
   "d": "残念药剂对你必定成功（稳定回 2 点理智）。"
  },
  "realm": "深海",
  "role": "防御型",
  "line": "五成？在我这儿是十成。",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-151844": {
  "id": "a-151844",
  "n": "薇薇安",
  "en": "Vivian",
  "hp": 5,
  "items": [
   "oracle",
   "lens"
  ],
  "passive": {
   "k": "precog2",
   "n": "先见",
   "d": "每局开局自动看清前三颗子弹。",
   "v": 3
  },
  "realm": "混沌",
  "role": "辅助型",
  "line": "枪膛里的事，我提前看过了。",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-77913": {
  "id": "a-77913",
  "n": "凯蒂古拉",
  "en": "Kathigu-Ra",
  "hp": 4,
  "items": [
   "saw",
   "oracle"
  ],
  "passive": {
   "k": "aim",
   "n": "先算后打",
   "d": "每局开局看清第一颗；每局一次的实弹若正是你亲手看清的那一颗，伤害 +1。",
   "v": 1
  },
  "realm": "混沌",
  "role": "伤害型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15580": {
  "id": "a-15580",
  "n": "宁菲亚",
  "en": "Nymphaea",
  "hp": 6,
  "items": [
   "chain",
   "whisper"
  ],
  "passive": {
   "k": "serrate",
   "n": "磨过的齿",
   "d": "每局第一把锯是 +2 伤害（锯齿），第二把退回普通的 +1。",
   "v": 1
  },
  "realm": "混沌",
  "role": "伤害型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15560": {
  "id": "a-15560",
  "n": "潘狄娅",
  "en": "Pandia",
  "hp": 4,
  "items": [
   "cuff",
   "oracle"
  ],
  "passive": {
   "k": "lifesteal",
   "n": "借来的体温",
   "d": "对对手造成实弹伤害后回复 1 点理智（每局最多 1 次）。",
   "v": 1
  },
  "realm": "混沌",
  "role": "伤害型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-94450": {
  "id": "a-94450",
  "n": "茉夏",
  "en": "Mouchette",
  "hp": 6,
  "items": [
   "saw",
   "whisper"
  ],
  "passive": {
   "k": "menace",
   "n": "噤声",
   "d": "你的实弹打中对手后，对手下一回合用不了道具。"
  },
  "realm": "混沌",
  "role": "伤害型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15569": {
  "id": "a-15569",
  "n": "萝坦",
  "en": "Lotan",
  "hp": 6,
  "items": [
   "chain",
   "oracle"
  ],
  "passive": {
   "k": "precog1",
   "n": "命轮演算",
   "d": "每局开局看清第一颗子弹。",
   "v": 1
  },
  "realm": "混沌",
  "role": "伤害型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-145363": {
  "id": "a-145363",
  "n": "蚀灭·萝坦",
  "en": "Lotan: Cetarchon",
  "hp": 6,
  "items": [
   "cuff",
   "whisper"
  ],
  "passive": {
   "k": "siphon",
   "n": "幸灾乐祸",
   "d": "对手自射打出实弹时，你回复 1 点理智（每局最多 1 次）。",
   "v": 1
  },
  "realm": "混沌",
  "role": "伤害型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "c-dragond": {
  "id": "c-dragond",
  "n": "魔龙_D",
  "en": "",
  "hp": 4,
  "items": [
   "saw",
   "oracle"
  ],
  "passive": {
   "k": "grit",
   "n": "不认账",
   "d": "每局第一次被实弹打中时，那一下的伤害 -1（至少 0）。"
  },
  "realm": "混沌",
  "role": "伤害型",
  "line": "",
  "creator": true,
  "face": "data:image/webp;base64,UklGRtYEAABXRUJQVlA4IMoEAAAwFQCdASpAAEAAPnkylEckoqIhLhSccJAPCWcAw2ii/ZBoxp2+p/KLkfxIO4d/WV2wj0sv7H/qOh+z7/XXsDfy/+s+l57N/Rzai/PoVnFRBFo8M5KBHq6KflJodfP7KZHRDuNLu/6IoXb7dMqaZJ0z5gcve4NSGWQ5zoFb/noOH6kTcz7TXU07nTNYb6I1TXixcIlEBZP3g1lP28xUtlCrfHwlXRl01UK0qOZCkyn98qUAAP79+B97PVUpT/MOJ0G79Y0xvvIT9eXdisvNXiMny2lqw98JVGpRjD8xW7YG5GMN3SKFhS/kEipS5KlhiNORz/mh4zdIYw/qdtdY+Cu+vtZ/M+doexy9WT1MhdfpaFL3p8qltJxNdf1ZWjkdgTs2Thod1qoWIdMdW3aRdUf9oK95FZkhrboRXaH+fKRQjnYnpNHkxclGFp6sWKFa2XFTYZbs7MVtLt3m9dWorKpmDOSYGPm/XHF9rjBqC2f0WaV6eFf+0s3TTtbUsIyPh+F/5069TuKnH+ciCxFJG9rAE+L+Dv3oWX5wP2gQQwqoIFfXo2gG2MufFt2NrvyFtsK7wQPgHlHpuky0HOg3EY12cnjW4W01SBeNWvVxv3CqoUT+KuhZYlje/fT9VJdt3SYhN4okk8x/IWXQOcT6BCGo8KlQcXEf7hc4bnU+X3TDbeeFjep21HUVok5OdUgqFHTc3x431RpNMWG3sWgMlcQ/oa7kd6elYR4i/TKspjmZ3V0ycPTVhOA51TzbwIqbSSsQrYNRgKyDZkWaC8YvndnZdbfyW81BI1sczYHpipueXAq/ajChDsoX935OSfiajNS0CcUiUFyt48oFMZxzf2UEEYXcdT7Q+0t2JhGfMeI9h1oyklxGu2O6iVsQOxMYDBmU0nOWj+FzAqivzB2c+r7hh2KLVutcnt7jsT65A++WdJFVziV7NiBphWs/AUf9xsCbknY9L7gX7IB1LBj1oYtPAxmFaq/liRO9Yf1ZjBYFHTJRWeT+hTwP/eDg9rqF3EFosG2atOf6F0g3kGC+7BM1a0HUz226fhwJKUFMhVd5wBNS/O/GeeaUNtFxsJj+JZCtr5kWoAzg2mix3zw5oZHNa7hAZECsiBttCNvFfxTn2TfTFGWK138QXtgpC4CFAMtXtwcFx1bB4nypQsggFEDhjWoiE4hON9yf1/jrv44TG2VjQedRO1+0D2jDOq8Bh+/bi7cOt43A8ORIN3l9/aSHrNgWZ/bvhG/97t+uqVp+w2Znn5E+m9JSE6yCtYTvZqVOf9g/nczNbI0eNSA+nQsEaLpQK56+8RsG12hnc2oPk1LgTa3aP7B2pqZsPTFm7bVq//pSP/aOkEWXvT3Tb4Hv1JSHbgzPRdWTRO5EAr3BUJMAxd59HeoW3yXpw2QS+f7QcGiIHB768nmHHvX91Eyz1scOVVj+f3fqvjiOpFcFuQtiXC/9eHYgVGspyh0EKMvqMqyikHJ/U8lRN0FKM/YJjH3IiZnKhcfDgSx2cX5rk14sD+6eqRW5HwgwGe68fmtoywS74jGFxKaYrTTiyaTApUyb4EkZRjbsjufCX5chxF5pMqjTj6dsAreuDQ+UhYRcaQV2PCv3a9xR1r7Pstcgv1nlIopV+AAAAA=="
 },
 "a-15585": {
  "id": "a-15585",
  "n": "奥吉尔",
  "en": "Ogier",
  "hp": 5,
  "items": [
   "aegis",
   "oracle"
  ],
  "passive": {
   "k": "armor",
   "n": "错位外壳",
   "d": "每局开局自动获得 1 层护盾。",
   "v": 1
  },
  "realm": "混沌",
  "role": "防御型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRrYFAABXRUJQVlA4IKoFAADQFgCdASpAAEAAPnUukkYkoqGhLA5gkA6JZQC2/EP95WjGfT6jyTMYdo/2VDnrRzKX+28O7U7iovCgmX/3L/q+oT/zf6Lz0fTPsD/rN6XvsZ/cD2ZP10c0ZjZeqKMB534JrWx/5ZEMxm2NZ/5BW8dfw5+Bq/wKVqeo136dczoxdlMe1WsGWyyIlp8Txf7aC1W4aLCkP3A/kq8XvEVRKr5KVSZgHoT/2f6m9ewxkG/T/l4Xtb/Y2lGD23i/jjvCAAD++gRLuP1VyJZana83oMcrW7/ZRCe0wNGGSAyDczwMpPVcP6POHQ0L901IOELkZdFRxxNZhp7ZRaipJJWHD5AhZ6JQrtM6v/VznIJPCnZ+GIj1K75mpyrzdGuOtWOD1e8nMUYVPYV3llI8UXbgsK6CxQ41uUfz1s6Jpy5pOaQsZD/I1W8t13YCWBQ+PPQTwdF9LKDOgX4w+nTKJulp6GjppQob2OpiyLlVh88bPICizyDrudlJ5XxuCHxl4WEEVLwerz4WVZSsz+q9fdnEL0im5IjeHJSzB4i0lDepJmhqQFyq3BJPIr14G+oURPQvE13wH11WeRZKbQrrjV0OQYo2GEgqhvdhKTbsNG7lLKzUjbuiAkDOaPjBA5fqk4BwmSG4ZjTWf+gTDvL6WU2iabaXYfMiwUKehw+VxxhJIZHDe3G0Ij5UBywftz5gjho3VBTdDNrfg6wwYz5fzTcMhRjE+IqmP9slQdCaJKDEt/wVbC6F9G4vM3k2n/QK4t0bKVr8enN0TRbfq/WzapWF02VtJVhMK8e8aW0bve2NwqVH3/fL9v0ppx5sB+jHRo14ZkcRZh4vaJ75nb4/pXkfKdVERLENxBjq2S8Ub10TUw/MBqIDpGXC3874KIhqyoXJxLppzqzm4DolbCyYmVm9CyoerGFlGllsXm3KyQ+OvI/YSudsvemFUfJQ8YpgLML0oI4/V5SEwqK99Z2BnLVPndrTJjAZwonhruBCFTWRKITTilf9pdAPlDiPoRjHvAm9HSbYZVNCPumb8uFFfxvSg48GIhx6jfXYnttExqdAf7vrs3u4FEJN2WLDv5vTiV6k7huIePhyKXnSmO2SJ+CUlBHrvCnvEs3L7aty/FHIBp8Dnnz0UIa4OXnRlvKBxPHP7Pk6LZJ83QDawrbIeVpbxwfIadyNswA+m399VJ8x40loPAjmCnTSfyidO2wpv35NCCfB+yzz73Y9zDm8iDtiGg+l9d00E0Ax0dhp7WvDHP2mIZv5cEsfePDAe5hqt+6nAtSmAX2rbx25jgOB/0dj14+TCHlRuABae/fG0IVmmPCd2jLesy10pyOzHDxU7JUhmzt2g2HbsjWGmmpFOvFEDnp0trugh7V2qfBQ2YBeFyWtRNbLa2odZLITQXqHbVQzCUfF9gD5W+WKbsOnU+rBNdKa/A46z8H+MXC9Ke8kOD9/9Xa7HeMve7vGWan/eEhHnuZRUrjQvkFZ3HhIzXK77rvmeCIzoKah62gTNzsmSIo9brQ1lFkIEHK2VDdrhu8qcUDScs5m/KI0Ij0WzKhAiP17KV73JlKN65mFIP96wPPft2VrI3CDNzh1QwJVsLm3UFjtM7M+2cU+LPgQFwJM/CqNd2iX0MxbnNVkcU448Y3iWnPHsRyRkUd6THzQ6PUEX4WFSnY3bM5Os9CM7tJo78IjR1x2ooYPf4F5HB9nOEdlLw9kL/Pxi7rXkIPuck5UIoxVX/PSV1+oR9xV813l6TK/f/kTB5hRmJM/G9eKnJrsQue/mTcJae+RGPjE2qfj8qTezAEgFvWT6h3IEfXYsuzsCEdU8e0+VVDjfJkfzZTmxoEjr1wWlT0gWbiNPu2324FMnVfto7qPzMXKPesuXiZQ1F/bCVNTtsBYlEzNwFxcKrbXaNBZCvtR5504b8Ba8EXBfbpnIkGwdMAA"
 },
 "a-15588": {
  "id": "a-15588",
  "n": "艾尔瓦",
  "en": "Alva",
  "hp": 5,
  "items": [
   "smoke",
   "whisper"
  ],
  "passive": {
   "k": "grit",
   "n": "不认账",
   "d": "每局第一次被实弹打中时，那一下的伤害 -1（至少 0）。"
  },
  "realm": "混沌",
  "role": "防御型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15581": {
  "id": "a-15581",
  "n": "莉莉",
  "en": "Lily",
  "hp": 5,
  "items": [
   "pill",
   "oracle"
  ],
  "passive": {
   "k": "revive",
   "n": "倒带",
   "d": "整场一次：理智归零时回到 2 点，这一局接着打。"
  },
  "realm": "混沌",
  "role": "防御型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRroFAABXRUJQVlA4IK4FAAAQFwCdASpAAEAAPnkykUYkoyGhMBv7AJAPCWcAw+BbvcJpjoX+S/LLkBtEIo/UdnymVe/T1MlUr7N/pP9V7gH599A//p8t3077A36yel17D/3I9kdIdz5BFHnQxLfmynVd9k3yW83Oywh1niZgamiyc/x9wLZCR9SOEKWkni2mhWzKBUiOW7NKsRzQJkUSFFDEfJExEEIUtLQ+cgs3WX4IYE/soNLAYWwE/VvaWxSqlZs2lO8nNUoAlAFiVTRcmLcAAP79AxbByDETMxx+fBCq6yXtY9hvVuQBwL838J92R0haBy7MVprdqcSlqgT0SfJ4yeK/8xmgYKfnAUx/EG838T7oVo62RA+9qC4kWOz26krZNdBG0A6oa41TmXCaIvcxC6G/NgIbtYyk90uU6CD2c7Mn9p76ICIVkxN+lG94/bCX+MyclcKIvPXkxi3915FYnTXRrtHsWStpSkNIKvQxxvfGKa53itvvdAwH9ntBMxRsfsq0oKnLL6CBfFf3oAbhF5whxtt2rB62sdwtAWqO+pMVtRXBa7B2mOWZYrdZ/OIMhdAprbLqOmZ26L/oXvmX1mYi0M7Jlx0WWRlrCprf5bEmdqXZBFpkzIP1fhPZKe2iNqpXyJqA2/8fSW/ZymD4sSt5+PUqHeRNVJwbc6vN0BNc0ydAzFG/zkPafwetKLSkOUky/fQ7UR8ArLCG6CSsclu2weWnevapEVpsenKPuIOkqpOVOt07bCc/8J7nWPbm8sSv2ZlERkKNUYYo2g71NkV68oGvG0dlpCMYrUOIEZGX8V/8p8AKVt2SxT2J6L/4XhQnv2DEVJEm3VvEhCSQ3dyqspm2mzPBLmzuLla/4mOK5VKpLLRxoDBiT+5UM16cL3n/0uZ1hxtL9rURemHMzwU5Yh8uc5e7v/1ZsdRZdUutXDmYOECCWm60suawHb64up/hZ+kMKsn3CYEY1yoi2BzYUYOAH4ETJ+6w+nx7N1RNixNNXjhnMbxq0YTUTDI1TlJXlHpNH+/aI2pkDc3VmppuwD7rT7MFx29e/vbmLK0yEi8lKEfW2a8JRmXLYsotLq0tTv9nuIiALsOdW4vChAPjmFojJAzLr9dXPSivpGay595MAgiYAcQPiOyVuEdH/gly8+8pWWm13yr9QuP/UFYh2T8ZIDYfHgp3VEhNfTc+DCiLu58K/DP+BpSI6uxnHYIskDNWyjGKOXt3xWwKV4YxBxatv2s9pZ4losxqPix26SRJD+tc28R+2b6ngSTKMo++0MhsrxGNkMayjHYAlAQpFkBIGE3AfbGXDgjrC7998yWHM78/sg1saO3jq1nVWCnQIIWhnkCmJmP6s8p43KCm1cE9OjbXSKXgH8x7is9D0zc+YbkOblVP8ZTUyPzCAvjgyMNr7Or9uRCrCDx/DuJZHc01qwXvl6HUtNSEHN7z7rNy8WsvNJxsBjvMUOkmVFV4FCQctOYX3bdmt9mBG8tTBmvILoUEpeZeVWvX0B6AUVundeD0BdnfSkcEhSK1hD5B/xR+KM/2LXhtJDzz9kmMwR8wwUdfxb5I9OtFMMpcN3zNkRnNbPrzMiLgYfW77t39cwblmAsQAGG0eu9q79fBE0xUw/779yf4jllf8efEgT0rjlRgTI9K2rv3HDWmPMoB94Cl1/mjzuRiFcJM7yv30h5aJoCocmuNwRMqK6rKyBHzRpVH60E+sygA4MONrNUOQECHb2wPRUwHCoOu/CY5Fvwm/eInAso2QWzG0ldTBuMFFBNu/Fy8zbykKoXcBnnBLiyxAfSgOfQZNJAVvCShPmOhhGlmuWsIvOHiQg9d8bOO3fS4eiTM7BcDryRPNioygQ68KmnZTcTOuLoF84DwE3ZtJ2tC76T1Gc7IGbHgCl2vVf6Gv/hOf5JUnH+ERCBsTeD/7ZPa71Yn8le1M0xpXr46jOnsbSAAAA=="
 },
 "c-samo": {
  "id": "c-samo",
  "n": "萨摩不耶",
  "en": "",
  "hp": 6,
  "items": [
   "aegis",
   "whisper"
  ],
  "passive": {
   "k": "lucky",
   "n": "蒙对了",
   "d": "残念药剂对你必定成功（稳定回 2 点理智）。"
  },
  "realm": "混沌",
  "role": "防御型",
  "line": "",
  "creator": true,
  "face": "data:image/webp;base64,UklGRgADAABXRUJQVlA4IPQCAACwEQCdASpAAEAAPnkylEekoqIhLhSccJAPCWcAvnyESgBJ/an+N8G7CaI2LhatZsYdSQEd/oTJ8ImN20XvSBaIOHNLWEFYGIJqoY1JzGDaOF+WZoGR5eFKCJ+lSw6Lp9oW2QEnp7c8WlhFI1Xs7YbhpT+uIfgazgT1KSBDbvQlIZNyO7WNshZt6gGDBo6hNKmRgCF0tHAA/vkRuqyWQpKUVWbkkoJDV4XprDJGZzdyiBnV3VEFq5QPDiDO3bngsg/GVLosrgJ4NsVYDSn/VF5bv564VqmXZgP8YC6SAz2YaYZFETSKb2oXrCy2JYYNLCRZFUt9sswTt9UQuMPnEqbbmegQ4qatYfBWNnmKjRZCp68GA9i/5EgjERqj3HJkBTjCGyWwchW9GNksE3ppeodrDtFLi7HN6lxAH/2fRtNYmpJ3G92ODdJ54NLht2Pg6ldr2Jg/lMVqMnE9y4cxR83/JpBzMOXqmTL2l/jYzXL2QHiZjSqlo0yvyLUis4m5aDRev6uMn/CUBAehUZwpeX96O7ZNPTEybJdNXrQNzCpWIcJKul7Px6W3eZoyGu3LDb5COHlABCfg6jYzTMkZtai1CppZWIrCNy0rgz746i0km5JS3dzytnxjhsh5eXCTubK8XkzxFGR3Kpb6Ncwrp0MRZ0tK+peXQuPAHdOx3/9Fc/x6QDzvbOFu7O+wOqPhyBYrOn4r+DjXcCLL5RtHU6NlFyVTn+/JsyUMEDJDstC4ljfHkylvClSuClLnoHOYyCgmidcmolOEs9PeBMGHiRO2BbjsbQ8WIGr0qLK7+p3gZUWAFZmCYtEJw4Vk6SI0bWpvKlBOqSMUrQPlWvI5N9HuUVMYdLgNiKbcd2+E2o+sBj5M3P8LVWhCujeXx4rf5Fxr0zHvIQCfPgU8WGFOkM2oCoYastWH6IHVbhdkVMiv/abIYfh0FjE3Mxol3dkWqJFfMy2+xokD9c8292FyCPrD7ytZxmJTV5Lf6mPKFEaFFnJIAAA="
 },
 "a-15565": {
  "id": "a-15565",
  "n": "诺缔拉",
  "en": "Nautila",
  "hp": 5,
  "items": [
   "smoke",
   "oracle"
  ],
  "passive": {
   "k": "extra",
   "n": "兜比脸大",
   "d": "每局多拿 1 件道具。"
  },
  "realm": "混沌",
  "role": "防御型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRlQFAABXRUJQVlA4IEgFAAAwFACdASpAAEAAPnk0lUckoyIhKhzMWJAPCWMArk92zlgtLFszb0A8F/H8B3aNsyLY5ZelBmeePT6s9gf9betH6UbOE8QLINHI7KwC5OBvbzMe6SVjnWu7SD7szL2/IijzI42SFLOh7UH4xnMoZvr5QWMmqRM/1XCUGgz9Ruk0DBM33suhk51ISURZ0IizGqmbVd8+3pP8lT92lb878KWsjGvi7FwvPNkJgAD+/rau17z0/AR2Prb+qOpzyeWFH2BaG79NMTORQ7xPyOZNnAfFol0ATccW9G9fA3TR5FzZqhlhl0JVyQNJYzZ6kEICeDcRRuwT3yuerAEbn8LXi5Mev6M8c0WzVUIhrpPUNeTi4WHhrHjelbTSWGl/DTaw7WMDnRSdMLy8WgSAvxuqYZyxGMul0BEKu3jJwwKdl+aD3R028lcPCpUjAyZR7tF9CAXIlBvo8XTsC4MYIqHoLKzfy+i8z7SdlVqi9DD+qiGy69W/Ml8kJi/vLHxNhg1NF55kPScR3l0V6ELVo9nzgFoHnyFUsRtOmw9bSm2yodlonfYRd5YzWEf5r7ZROafZ1lQ9YaUFdCSpYQ39RReJglQmj8OHnzTp4TgvAoOnDDnfIDT30Ax8bxQoEZvA5qwdONG9/vfwiBlvgBqODi0hl44ukUzkiqOjdK6+SxeSN5GV7IEqdR3wTBr4RMoricQkeJY8kMikJXSW18MxLTQEQkksL0JPpeLcnbFYRLN7IgVK4GswyARm6fIUjKI69jtXHu7A32gcZNOggpdqD09gVAkSNmJDCVucnPKErac8uOlA1i0CfR9dqiiWxIYXfsyvwd9Y30EaaboRVPGbaHVFxuVD1z/5q8mXS19BHzXEMjajNcDMYHJlmkvL4SlYf1bt8zB2yOn/x2rZkaw4hmWlo/eHsw8aHJOBXSobPrYagmWwokEkLR1iDidwCPQKFt7FMn9LF7DTgCa2LZV8VAuPrYciiWNC1qPA21507kHnrzCR/FW0FGEv+nMhpkn9qbo986MbuBXleNgHQ7nqlSMU7fqvhrhbC0KhKfNPyJO+/ZH/N+DxepTGNctcnR5JRq5zeS4H+y0x7tDSfFdVO+4uwGBukVMM5QuOC+VQDa/5Ev4H8fStwbjHLHHffC+keJeZnjzttnuI+h0XILvQjQVU/0NamIVAcnpxD6oei9sVnhvTrbhDis+BT1dH7JlBUis5afiBusEKTespqTDMxc+vGYAK+zjeI4uZWluzuLhcswMeugVZn47A47+jtbd2cpWARp9GNy+sXmrfEwXD6gOfG1VcMmp+kVvEt+4K4I3d1FI+mddoBNsT4b8ctmEBNzvqdhfjufPR3HjOS7RI/aj5bprP3IQoWqy6P9J6Re7tZG+X+bP0wLdW5MJVAszifvIYNJDajxpCeDr1udbuM20E7Fhz+UM+5ZmUV/TGn9/+Ttd3z2a9r212klGVF4zEntAwPDwN8sKNREAJXBlPzjSr34EUY8bTAaMVxgGAdi/UdpzPym6TB9iQh6tY/rcLdmOexu+uBdxT+/N5eMR/MgFnI9D0PW5UUT2j7y4+YDmXXVg+p2fM+6Mxw/JB867reQdCKVRFiciwU640Nq6nYgKN8df2v1BL25a6KuBivzA0zEO4vE7HSXMZeGcY3c7l1nJkjC1+Ljl6xdf4viGykvzpcQsHzFUJgzyRhryiiFBRgWaLh9V/SOatnpI7Q9zUNRxyQ8SsQ7kAL76CvPhrcUpqopKMsjNofJmuoS1JzfMtaEAv487CoW4Ns8Bq0Pj8Xmty83+LxQvYIgAAAA=="
 },
 "a-148578": {
  "id": "a-148578",
  "n": "负誓·奥吉尔",
  "en": "Ogier: Oathbound",
  "hp": 6,
  "items": [
   "pill",
   "whisper"
  ],
  "passive": {
   "k": "greed",
   "n": "王座旁听",
   "d": "对手每局少拿 1 件道具——桌上东西都归你先挑。"
  },
  "realm": "混沌",
  "role": "防御型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRioHAABXRUJQVlA4IB4HAABwGwCdASpAAEAAPmUqjUYkIqEhOf64AIAMiWcAxVeoLubxEckvojOCwP9M+oF2L/uvLHvB922oF6+3QkAH5v/XO+11Du+2sYee+wB+iv+t6bn1P5tfpX/1f5T4A/5x/W/+t/evaw9g/7W+zJ+1RRKYFq4Dtcu1/9eU+lpvu8Lu3dwb8oY+vAGHOL6lyNOrvqjqlbk+e979F3dTIGqqY9wEw6n/WOagqeOLcdRP8CT5dPZohYT8ZQJeSSxi55Luuh06Uf2/6nyN6g2sOgYq9j/9X7//l8bbs2nqooQSZS9jASbZ7AAA/uy3+XM/LUgi+gEtT3ERUclE+G6zuhU0QDp7G8Kvy5tne16pHC3Ye4tvX8UbwYJ9PHXErZlnL10yf99wVsdSlHNN76v77GnXL1OmXbExMHsvovsLt3vlX7B7tfe0LGP5An1nYkj/UG7Oo3Hv1VLiwveb9gJBHVNB3g0g6vJECY3kCghtQFtJf52OzZ+pFIkCqj2AyK0fEkTTmIRe8lIL/QIf3mjG/pUcvSOzdH7ED/j25SBsf05cIhp+7OYqsg4V0OFgRZl3Z0BEMgjoSDzxAMPwbNOm5rXr3z6k7ROXL84yS2jY65RQudumCX1x48NGjAVOFaP3PvOw7kJwXSbVuvKo2KuygcQcmqAJOl8tTXkP72+jY/00JFYANKxDRvbqtWZg/pCffvjjbOqkKlZlW+SnBup7dADH0gQDte9Qw027kRBx/vOUSllFAODQ+SwojrUdS7TSRffPf2WyuMS+RAFxp2dP1h5KO56V94YRK2BuSq6aJWAJk86mOmcfM7HRIUD40UesdFBO9/KCyJcQr4ReBOtKfO1e2L2kBDS8JHaZ6bI454qIMTea5kSX27vqufNl65iuKYJRwwyu1aCKpRtsUENFa3XMCAKmDuTRsByDeOjl8cm5H8W1TseV+40K+Tu5tW92mMhlmivcSwbMi+eawP5dAXHaFPkNbsGasZl62kKT8HZV6LJcDvnYyQ8TCYVTQ9v4Ym1T44zRWOoixIdRz0ivhu0qlFvTvfsMqugrq32BFugsXVh1ojyj++2pIR0VAhlJG55gLtzMAMASKEuBUWPAGeoP1XSEtccekuKLbfYf4Avrr/pwKCaUM7IX/PgoATAvSV+JByjANe006mOLK7WWXNefct77MySTgxl6Fh3tKlLYidAANdRCFv3rfgZax0dfWq4M36clGuScjJqks72j0os4fdH2pT55vWCo2FFPOMFm6uUM0cMb6csYjv5xTdk6riZQpVILMuHy4AZ/BRAPjK3TVDXsuIjxF0Kdc8IZ6VpE9hD/hLSaexQEbru7JIJvaMg9sCgrt9t8MuFUaNrxubJjGaqCQHfhy2WRLJTdRRojvE3H2GgdUymJFn5KYc5gKWuOTAIZ+BjU5prBMZjwOEHHDwwYNoFu7RI8wYeXfxrs9Sb9gvMLmkNfOb9xz7oSZdeSOqwIrYEW+n2oyVnS6s3mHgvxHhfXVGwFwzS//AHPaPSGV/X0O9gfX3h+gwfpDnw/aGWoj+L1k5EsLfN4dFkc0vyN70xTA3X6wrcOWfx4rQ+SEuU71s21Z81NBDcLAnqh5na79isEBaYFbamNk21EBqDKHEi3+1lwu4ndJBwNytj24C/pGRfc2nLnALw6OY9Z6JyqQ/DEyJnPvmAM+PRUR7crChwjrUxr/jmtUXkhaKhB8tdH+X43GXU0O6sQ5jro/ra4rhMIIK37WrDF/aPuujZqmWU5rfIgqKWvyly52ToCMJNm6aZnzpAoLcEb4mPHjHDHnTFS8FV83m52YKxGKBRGkVCt2Sc/WAPAEkjMUWbr06mdgW96i1x+xIz/Q+CyXYkFBB5Xb6JQxRrGFGSseOwdyb3be6fOmjg5rLgmR0UOhDkYYPK28aq9Z5revKCnX/0cG6Ssmxv7yO+jwT1lAQZ8HoQIsKQ5UXXTdoIdf+QI2oGxvx+pFEAWUEUHsttQMCXJ8qccbjedp3KTH7ag49PCY3zN7OP2OGQaYMtMd4TQJ6utzouizSgVtIAK+zHT63ywLRP7Wt344tDn/qfzaPDe72VYOAVeqHpxpwXSx3/kdgsncxDroFQx6oIqcdxwfk7wXyHvxZoFY4AQ3NyMLFVTGTuF1MFEiLzab1riovUFPECHwZGLzcQLK8QiyHJuK2ChSdoU281xRqzPHwWoDsah9h36qMrjSCNFmuvpqCo/KrPHcPyP7OutlrXTD7iuAdWbLz9SEs3CbK3mgIvr8+VSl/QVlV+zircbH/D+uVHO9LOnaCRjcC6ZqSTdl/L1ib1m6ZkV18ah9tbTjK8NKPUIqacqj1Ju7ZnGlmmHb2VGWs5oA3LjXHJaqvBOeDCnNfjT9uoSnRsWdTzMvkWdGkz7AAb59SUoFzmO9LlN8/hI2CuK1DSC/TGheEYUAAAA"
 },
 "a-54117": {
  "id": "a-54117",
  "n": "哈姆林",
  "en": "Hameln",
  "hp": 5,
  "items": [
   "lens",
   "oracle"
  ],
  "passive": {
   "k": "precog2",
   "n": "线头之前",
   "d": "每局开局自动看清前 3 颗子弹。",
   "v": 3
  },
  "realm": "混沌",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-54116": {
  "id": "a-54116",
  "n": "塔薇",
  "en": "Tawil",
  "hp": 5,
  "items": [
   "scroll",
   "whisper"
  ],
  "passive": {
   "k": "echo",
   "n": "回声",
   "d": "你对自己打出空壳时，从桌上再摸 1 件道具（每局最多 2 次）。",
   "v": 2
  },
  "realm": "混沌",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRq4EAABXRUJQVlA4IKIEAACQEwCdASpAAEAAPnUskEYkoiGhM/mcAJAOiWcAzNeuiw6zo71tRftff7lqMDvsJ0N9+HHZ6PGgH6k9g3pAejwJ0AlAAn3M23/tdeWkObiHxhMFeIMN7/T+4Gf7yVWvw/6M8dKfvfU0KYTo2CLIvTGaTqcd7FGySFw6Mhay+2CGt7RFoxLE8bVT2PWwZMj8bN/RWqTV9A7vWAjVnJQX1zxye34FIAAA/vpgqsJbfNpVRrFuU185677vo/pbn5gzi1GlrTMBXqfqtOPlqVfvRUj1r/76MYMw8KDWc8pXMbbpuBgDcjBWPzrJyHYxZTcc3MJC7DkZjs8GaBI3lDFM6DFI9mz9Jg0G+eEYQlqZu4i31kOW38A5ej57JRM2DygLPqJd4Sj0Uju3ZBk4Ml8PEFuiAyrAp4+kJ260r3NfuJN7FarEhReBa+XV2CK8fw3+SdTWmgRILWcMfKnEAgbUrRKWifuYdmCl+Pcmp+depmmegp4RhfQJkm2ZtYz4mO2X4JCr8RMweCC/cGKjDHgfjkoEDhX49mA6ce9kmoONEEc86B1CyX2186Q7HOqnmlBQyCZft+86XGZZucIW6txn7yEZlx/1mtjZVcOn7q0a4HbiZhWwpzRaNePuky0QY49GQoS08Kb86+a5zKiY/lOgM97vfxg+i/fsGRz1hlWrbGplnGLqolNv776d4dZzjDqm5fX6MZiXzuJooOYrcZ44Cx5HlXN2Oxz8v05uDZjUm3lWBXpfbWO1QWKrCzEhI7VdsbbLoOVEGj/uyOKW43pQrs4REESuk5i2mGkiiWNUPghFrEZHHnU8aK3XQP4aPar0njribVs6XVbMpTmNhIefegCXbhuy9/jrb4ZniUocoZ1Cat+hCLMs8FiEAuNKbljixdlEV81uPlWYt6SdnPE81orSRaRTUJRuTSgbsRvxb5AyHzscwDkX32rmD16Ab+OuxxBzXrunKR+Vl5K/9Jmr1D9Cj/vavBfWxZbbotfNl3zoAcgj5d0Yxizthj0nr8YkkmdtxbSrKYEmwe2SUJgWs8UCg1Jn3YkhxCF4p5XXCkEJiyD5WLUhLRVC+4pvm4vmj1FNoAkoddo7LnyVD/ZSN6jzXFQSZB/7lGltKlFj+YRoeJ2hkD44vqKp8CT6meQSCURCUXmett4OALPx5CoUgcJQBbLHtrEu73bPiJ6hUYDPR5vxanWL/r1zAltKEs5K5eKRj378G77+ApVGJcYAoBRGL6f0C+XfQfNWr6Ndec8ju7EcVLPQf/80+/T27/zeWP/1HJnw15Ck5m8R8KlkVrYGBIcbT/nqdZppU/EO9uLEtPY4wWW8E3tbz5Km1sUlh1YtGYdwHwHBdqTWK++tA8DXFQsaDE5Ndz/yUQBEbyczzMPb702H0b0Lk8/+5tdcDlWgAmCsvMSTxajg8g1xtqvfK6RGLrmzfmDbm7XJ9Wjperv8RofeW1/s2z2pYUnqnvZvotTq+ssX6ZzpTsXvV1V3gn+41T/dRqpJvGtSrpwg9oY5OnRMjqr1WS/5mXB3rqBTd++BiWS3oJVhBY7fkNbj1/ukBNnU+rm5BUZlTPTCgAAA"
 },
 "a-15595": {
  "id": "a-15595",
  "n": "拉蒙娜",
  "en": "Ramona",
  "hp": 4,
  "items": [
   "needle",
   "oracle"
  ],
  "passive": {
   "k": "extra",
   "n": "兜比脸大",
   "d": "每局多拿 1 件道具。"
  },
  "realm": "混沌",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15602": {
  "id": "a-15602",
  "n": "熔毁·朵尔",
  "en": "Doll: Inferno",
  "hp": 6,
  "items": [
   "lens",
   "whisper"
  ],
  "passive": {
   "k": "precog1",
   "n": "命轮演算",
   "d": "每局开局看清第一颗子弹。",
   "v": 1
  },
  "realm": "混沌",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15571": {
  "id": "a-15571",
  "n": "珈伦",
  "en": "Karen",
  "hp": 5,
  "items": [
   "scroll",
   "oracle"
  ],
  "passive": {
   "k": "greed",
   "n": "王座旁听",
   "d": "对手每局少拿 1 件道具——桌上东西都归你先挑。"
  },
  "realm": "混沌",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15604": {
  "id": "a-15604",
  "n": "莱克",
  "en": "Ryker",
  "hp": 4,
  "items": [
   "needle",
   "whisper"
  ],
  "passive": {
   "k": "armor",
   "n": "错位外壳",
   "d": "每局开局自动获得 1 层护盾。",
   "v": 1
  },
  "realm": "混沌",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRsIFAABXRUJQVlA4ILYFAAAwFwCdASpAAEAAPnEsjkYkoqEhM/zMAJAOCWMAtke+DziGviLH97xkVnAfUVG1yg2vt6tABun8FN4NHl3QeZzXqT/0+4N+tH/P6/X7o+0d+4DfbboX2u3cRItKAmEGkWTNoYRftXjePQT3gIwu+DUsmmimAYd45wtPg1/3yRW8TzNtpFSnHYrywZzuDtw/0f3C419+dqRxv154/fdgbZgNxe47DBcvYi5/WW8AWzFy2HceCtiABG8BP49s2+6Bt1kwAAD+96A9X3kGqJEUhhkkRS4FVZleFG95V8m4PeCc+sGo7hLTn3TXZVTZnIdSswCURmyZBdILgFvAi13PstT0zdaUxc9fp6NKX6C+uvEDguaKFs9yR+l6ZwHWQqDeskKuhy0Zu1/LRqup/hVR5drxuBYyzwZOrKLfjb9yPEo5sC43bF9A0/I06AIlVHA9bAPLJR+VOI2N2joZ7MvJVePJH83wqUkOFVo0AX5fwOCMjlppLJtP+YGWUGEPUYqcP8rFbMVColkhCaa9v4/UCtddKn46QDT/aAldPqXgMPO+UQhc68XdPITZD+5zKcNDlF71G/ilr76R8Nwc0NKbSXrOqMSlbJ9FFvqMlBWd20v7a8LcZ4A86HyACQYLfZ+Z8Sz4ei3xFJN2GRuGn+jYBq+tuKwPyJZc96PVxfv+F2zj/R8ikZkhbJcjWswwGL/CTPVS1TPpVIitZsQ54f1mTSIuCC0ZCaWxci7O3m/iD5G5uJVkn6dDrOtZIoi1n86Ftqx93XSdlMRthI4yvS8G+JZea+Vj6+25xVk2ANC99/VlNq0MeAsyl0bXZlVjauLIxeZ0x1JJJfPoTUmhYSxCBOv+CEXXrv89wslC0Qwam9R9hqCodW2j4WbmzRbePaq6QDKqCW94rmDgZz9l4sifyKbijpn+CiR+og/SM9RvQv58yjuJi8HyjLr7iUMHzwmgrNidogYgRoNIYfGSFuGa4nc/GsU37bcGnn1arh8sDiDG3Mt4QdYfadEoBvtoxuUyIcehOc+orQ0bi/J13xY+bWuRvd4AMncg+tx41wJBFmIbBueN0jgN2aFJcekYm0FbNYuflmzrK1dRfSqe2e/N+GiL+HzoImEz0RAjFQLAJaOvZ0FvK/9qh/rr7Y8E4Q77eTI5HFMUTFeA2XhZL4QGLiThBBM36BgPAec7rSctAVTJVovd7pvPMicgXcLn8M5h0MDVcLh4hgNmLjwqN7GNjhU8qE2CCKBl4FfKZ66WNkLVTntUBUcB7qxKzM4wtBZAzA/1RHtQ8hixnZc+t9CUgmsZuKCSPw30nPP8HVZoHmpuDJ8SpuP+RLtTx5WzYChrE66p9Ud/4NWvOa8es0GKnbURIgfyLma7MWAQia6J5zbWbOljnNS6+9bDhZP7rdeWfzjbwcdMSTr6qNGvIbYtXcmqPI+TSJ/Avjng/H7EyJzR3ZHk3ymXa3jDws1gSA4baCqX0Fkv2rAfEWdxlXlYtXnDlZHLr/MFTMhq/kSllz3rKkq5F1DrG4zpVtai7E7HTR0HkvWU0+Ep9t220QZGllmjDg5+TWxYkB8l/9UPCtHq0mDCSPT6v7nezW/3ulc3XjYX+iJxmuGkME31vDyMaOPoBXqSyWhG4/UIB+3BH7HMsCFX+YbtUX4OPOE+/L7Ag8ybarb8dKOZYKbr9x7z0RaFMAvpxuwa91HDpwpyGOj/0McdhUVzH8DYDR2YAihuCVGDQwJ5sNGb3hhepstU+s9CeLWqsYD24Md6goLm2XhC9TkSqYEamdR+xHpXr/6Kg1JvDd/ZNGSHTtrCcwOI9mNf6pAYcKEXj6amd9/hpjwU2RGJAWBBkcwDwf68b/RcvVg0f0EMSgZ1mLkbmcwyTvWUcXP5FtMPPjUcf9BbfwIPIvo4z992Xbc1K/iE/+3jHomnHWTjxu6ggTBTWNJFW1k4XHyDSAAA"
 },
 "a-15587": {
  "id": "a-15587",
  "n": "希洛",
  "en": "Helot",
  "hp": 5,
  "items": [
   "chain",
   "needle"
  ],
  "passive": {
   "k": "aim",
   "n": "见血封喉",
   "d": "每局开局看清第一颗；每局一次的实弹若正是你亲手看清的那一颗，伤害 +1。",
   "v": 1
  },
  "realm": "血肉",
  "role": "伤害型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15584": {
  "id": "a-15584",
  "n": "索蕾尔",
  "en": "Sorel",
  "hp": 6,
  "items": [
   "cuff",
   "chain"
  ],
  "passive": {
   "k": "serrate",
   "n": "锯口",
   "d": "每局第一把锯是 +2 伤害（锯齿），第二把退回普通的 +1。",
   "v": 1
  },
  "realm": "血肉",
  "role": "伤害型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "c-ratking": {
  "id": "c-ratking",
  "n": "鼠王",
  "en": "",
  "hp": 4,
  "items": [
   "saw",
   "needle"
  ],
  "passive": {
   "k": "lifesteal",
   "n": "血偿",
   "d": "对对手造成实弹伤害后回复 1 点理智（每局最多 1 次）。",
   "v": 1
  },
  "realm": "血肉",
  "role": "伤害型",
  "line": "",
  "creator": true,
  "face": "data:image/webp;base64,UklGRuoEAABXRUJQVlA4IN4EAABwFACdASpAAEAAPnkylEakoyIhLBgNmJAPCWYArDN2vVFYu4wF4GW3I3JO9QSoH3ZkD+kPAHgLlwlxXhd6gSp3gA+iP+pf8z1Fc/71B7CH609YYKz60gDtQ9fFG7ZNUnxRoq7P/ClJR4XAHAj4o64Zkj5p1Zm54YMtjaV0v+TlquyPg5wGwWeY+OL2zox2f+fbzAdhJ/eza3nKjlFdayEF70bn3LVoBfXNQglAAM4/+TsjOjNDaJ2IUW2rUu5+JDl85Aq+Y8VR/KtRk9kYhjuzM7WKNUxrpt4jLuN27PPhgASt6Q9uiPY3lZWMNZLifwLvezUvouXI2z4aWRxGj4q6NHGa4B/5ZdfK2ipzB5rHT6jLK5r01WOJSiavnz4K8uI63JxUizKl0XZ7hHl81/+uzXt0Iw/TdZT4En/n4jMj/iX77bcmQYVXxWg3r+gNvtGFkzsYGMo8TkIXWl++7xcMLD9XteNb3vNLfNbeqiualFxEuVgWBZu/5Q8FLRrfBgOIvvzTSDWKTS4RmKlWIjyL5cii6nYxecDMaJn1W3NiqR7V+VnDftQ0CwpARCSTycNuxmnCIoL6o4f9VEWZGOl3cSISyl3JIUwkvif5kcaGUaZA91nUNL7x/VkFURXFLefvMpTqtv5T4wAe8/s52MKcDBe+IW+rsZMba9PG9NgF0BHw6qi3zu49MmBe1xEuyS8AGOBm+hsIAo7KmY6CAWOUfBOJFhMudiP2pxgEi+Gy/Gy/H+NVkUzCWWLAuc0TMXuv2KLg8zVhdL8y1sgDq6m6uxG9N/2Q5Z078p1iUnlhaDqzCC1Xi4+Ni4k0e0cJYLKZ7G84oZw628/dikcX9UObIPlJ3e2z+cMDblH2q2VowupvOE8+wI2fq4hKzPOUeXx+2puyA///jEnkfimLR/lbB4PRv4/zwf/0OD/f37GoDOz+h/z3lbf+r0K/2phv4a7YRGO1K51/5j4aL8ptxB9eXasRgiILdwCgJ7QYI+isnyCSx8YmuE9sQrZje9/3x66JvXpiQugBygH86k1Kv7PEFdbBMAo737mX78W1HPdDxFKF8WBaXZiCeobjKbxNLb4RRKduaIMrzlkW5o16bNcUFa7+urH+GIbMCFxvkTIrrWf56OlQX+qKm9YQfh4xGx5/HLnS9xd4JdQ395hp2KHXIhpWlXcIJAP1FQVESyWCm+3+clhLbljz6D9o2WjWLmABXY8jIuWVAZaHOCGKqq3OcdQTXZI6dRO5++/oRnIZLJopuUDxJZ//RSeQiYvEhckgbA2AcZ+d4C3G5Hrqv2hifBkirFB9zL42Q/IBTOs049qsaOI5KZ/CRZYNBcuqPDbClS/GwVTZvt5IuFzFxxSjyUKEGl02s5daVSJUWJm63whzRBFQm8jbnedOCcek/CjYeFUxG6tY//kbGy9XnJBxVZ9zfqYQldL8HrG/xJ9EXziHzEnbMunF0+geZy2Evx76Sv79O8lCUT8cMzOVmednrzCcwO1kNMe+ojFHKL3O7ud+nxMKSnRT7VZrTxsJ3H/7lRkaCEIw/qHqiNxWNaVpUA3pGtB4nu8mZ/FvwLXE1JS8XQccwZ0WoI9CkGyLjfT2bm3TjqsMBoArR1UZLARUEJ4LcU95LaTzOiKUXbrYrIyEHv7hmmrp3SVSYAAA"
 },
 "a-77921": {
  "id": "a-77921",
  "n": "卡拉布",
  "en": "Caraboo",
  "hp": 6,
  "items": [
   "aegis",
   "chain"
  ],
  "passive": {
   "k": "siphon",
   "n": "舔伤口",
   "d": "对手自射打出实弹时，你回复 1 点理智（每局最多 1 次）。",
   "v": 1
  },
  "realm": "血肉",
  "role": "防御型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRp4FAABXRUJQVlA4IJIFAADwFgCdASpAAEAAPnkyk0akoyGhLhtriJAPCWcAyUQw/XJqBo/+f4GcR3tf/YcOe13vPdjfQCgF/AustUAPzh6Cudd6k9gj9dPTM9jP7M+yx+yjQS19b/8PjNfkmNCh2399CZUP8xV4VaRFPSF/iai42vdwZZS6b2T93DuE3GBEPu4MpWHXQdAmgkCgjq2Z59vKVl70vsM/4A3KdvzrVBEtXKZ+VpEZxbmEusq6i8R7rZerrC1WPDkFLmXXbSN7oAAA/v69Dj/yKJqXXNcySxjvCiOawsFo1UhvHt+/ZrmQusqsFwq9GnNsQcHZ5tWyFboSjiIgHcBmNPE00L6HlnNy7R7VR/zDqL6DR+krrU7u8EhnDSvNkPfz3BP0JzTCOm9tK+x36JSzQSTEk9DYpWXnOVRPbUcmt1CLbsj6S2psrgoLMVNnVcVO1/bz9/jdy/MNsWXOPuFL8tAJts3uk6SPm4EGKD8FxZSePWSB4+zFqsawNAyiqvIneaLrIsPXqD/JwO8zew/dN7QfhbIQnU7P5sLiYPg8ILdPDL+3+63owvZo1B7jTguzXEnNxNWRjRV8/91dodAetlLQCnEpD+PQBuLwW5O47/155LaLuZWhYcFBt0qvecxtkryUMGVhu3bX3I07My+A6FSO6vq+Fg31ZKq1DOrOASLmPwe+ayqTeH7VNFMcCCw/jMj0m64ADer9oFhX9tx2y8qYnqH/jN3REELPhimMp/o4t3TwRsRflCjYTsrXtGb2j1K4s7YTaiP1MNsHrdFb5wsFvvzt9GxYb+iVHr9ki2wvp0vXECNfxmYyfPb4TeMS0OCGVk2a/PWdcSyh/F0xgQhMEoDJ/Ni/4Hk2f2VsnMBlAjIBMznrJ2t7J4IXrwfOAaoM8vjODzQ4i/lQ3nTgnpDUHt0H2Oa/r1mHw/8Pbp6xYi68ttmhXi+gi8G4P9x/83Vxu+7bm3DpZ2gVRszZDb2cJZVyGoMxzQ1PDgVjKc+xcsMv0Jpmgx4CaVXN+zi/DgvAfVe3CcxrE7C7VLG0r7tWJV5ABxTS4KullVaPd0xek9/Wmwr2043mjg9EgpGYIIpnfYQUiFdjWiOP1dlMhKz1AKScN8tpvb1jziHPhJDiBvST3RNWXHsiR0A1oeu66cHEl81uyRUCSVFTRwHlZGyS+ZmrUUWU9MlZFXvQqVHiqYUd0uLO6SIfqrtp55ywonx/cT/uXUt5VFZmaOR56cV93KPkhrkayFVo2hyALVNlhQIGuvI9EGC+qWWSLXPAynKoXgiwRnZXvJ86XO6yDRK4ylV2NY+cS4dPa5SLEXknDLk+oY33EcoBEeMRXVmzD6RWWiHNLx8/4pHWiilEAWangBM0a/x4qoGpQ0yv3TiuIvtWe49ocoxuNte9hnCzsd4BAw3iHIkFf6V7lTrRcxTsV92gu7ou6Hy7KIbyLKhn0hud/JgYntwd45CwCa3kz4ekdZgngQuARu9phtvwOc756GRiVb717+XFkGSoFtzvlDubA4TYC79b4ZiQY7YSfQ8DguUpDjoyzXaPKF3uWiXGniu8t2R4NyC+n1PqWYrm3v1P15ZjrKWSaKvRBBUMwrorr+tg5Zo4K6X5OPKtzy1qSZl15I0VD2ALD595gEnMpYJm0DXw6ezt8qo82DePZ0x5TTzVAfl56iZ5byjrq9QKDdjFsgpNWuHs3nVXygS2aimy/Fpy2yyYFTgMU9dil2evEWl07L9wSiV5wuewqOLfUdB1qbYHw9uX1tU27iYsOsWW+6CljIj94oK7b60ECkR0Zk3Rm80aoqkgI0pYRQB691wZhb2+/10k6/kXzh/dNIEYG7Sg8cHQ0kNnny0lYxCpBk5nKME7X8o/kb7YoIziBlvn24d+Cm16brxbyTNumrf27YLWB4AA"
 },
 "a-15577": {
  "id": "a-15577",
  "n": "菲茵特",
  "en": "Faint",
  "hp": 4,
  "items": [
   "smoke",
   "needle"
  ],
  "passive": {
   "k": "armor",
   "n": "缝合外壳",
   "d": "每局开局自动获得 1 层护盾。",
   "v": 1
  },
  "realm": "血肉",
  "role": "防御型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15599": {
  "id": "a-15599",
  "n": "萨尔瓦多",
  "en": "Salvador",
  "hp": 6,
  "items": [
   "pill",
   "chain"
  ],
  "passive": {
   "k": "grit",
   "n": "皮糙肉厚",
   "d": "每局第一次被实弹打中时，那一下的伤害 -1（至少 0）。"
  },
  "realm": "血肉",
  "role": "防御型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "c-maodie": {
  "id": "c-maodie",
  "n": "路过的耄耋",
  "en": "",
  "hp": 5,
  "items": [
   "aegis",
   "needle"
  ],
  "passive": {
   "k": "revive",
   "n": "不肯闭眼",
   "d": "整场一次：理智归零时回到 2 点，这一局接着打。"
  },
  "realm": "血肉",
  "role": "防御型",
  "line": "",
  "creator": true,
  "face": "data:image/webp;base64,UklGRowEAABXRUJQVlA4IIAEAADQFACdASpAAEAAPnk2lUkkoqGhJhqrEJAPCUAXZnB4rLpw6u3hu2DeaK0V0MnouU2Rz/s+GmXpwa0mWgB4tmfB6v9g39aOtf5GZT0b1fa5oG8YFmJtKLe+YjavOHjI3dsFL9UUo8NFEgKA+IM9nJ3Wta2A6xEXn67WEoWVJsVC4Mfk+PaRBxpJZhwoDNsKFMpJYjHBixJ3YNZXvPHIF2LYvX/sN40AhrkcyLixZaIwAP7+lADvxtaoHlRJDnwJ09733n99ISfkWZ8IwJrcNZxrDn97o5O/n2UPsgPBhKhQdCNOmIFjUhqcsf7sDhswjdA2dmf+NTAe4bScXHixAmau4zlq3LrfWIzmAnDANR6KADf7VLZVTGZ0P4nFL+Y65cUmT+xe2HjYO/n7t8rlTT6o4aLZ7uz2/mFiMKvfVfuwSSN5sTUlxBICmYw79e6QrVbjYRabQyiDZitNGEkQ6yrCL/IVOk7PXfdqOvQm+PqirQEoDGnTDmLW6vOtjkPkqrPAz0EyItT9naOUwOpwKnywJi4cGZlctIqLHgvu9vJCSmfAFWkYDCKlsJ0o78C3Jo3bRGa74bUUjXp4Ky6YZe4dsGC8PMUNXD2KyTKKJh5Gv+e3UJ7XaICSXy4tx+d4GwbpfvakU44rot+nWeWElKMgqCzBrcRBZKo+/35WdIwP5BAgw7aejO1+uFMqGCNM2+ZU8qEIZsi6TDQ+ecZTDLJMW000TbvfHiFAVjeItLuaLkOjJoITADx9xPptzMUNukRb8rJcWaFlypo9eEAhf1bKF98abmU+ZQjkq2wlHcEIZ/WOiOYUnWjdk8H9cCCSav2AyFz3+76jqwFWHF8+DSADFBMV0XU7YlHkI/JPCkNH1NtrS1KAGspsM/mKBEN3FCLx67oYDHZaP9GqPwn/crswCXKnz8VMBs9eYcZ/jm93D1Tvrwec7KrKviqyF2B9983wDOIUtUtmU2cwZXx6cyfoJR0t0rwaZfU/cDETCw2YKCC3OYfeFyogInUukzfkuUMfeZhB9rBLPHEDQF7rnaIk/i6qkQ3dCUnEMf6LNBsb6yqe2R/Ouf1DAOHxSRDUVLtZ58USgCAKgnVb3DxV2v0Fh/Cjqlbt2jti+gnmKdIl9zHL8mtvj1/nu8s8Z3WOK80FDX6S7z47UyvQ+N/lkw/6p7c/kM0wc+n9Zv9KcIA/Z8Kw1yYn2x1MTcu1kBTWgeg/7r/DWg0NVGwAK9t/5ov/6iKkh3fuRhY2TQiQVKbEaf/D3C/BGQdnzOfSwdApJZcyYr/7zkSUuA2Fjs+w0FaAas8JmjhFkFaxFwmlsQ1vqANM8vNxZHEy1ac5UCj+VyzPZV13y08BVoNVhKjyDUZ88RdUcL6v8lYPm25Ax8sjDE76pbdC+hzhCZDI4PwaqaN2SZpqDgntYCVranH7ZNZ64vq8e12AZ0yOtyXSXPGpascWlCzm7ieBShgXsoK1OUc+W7Vk2PAdD+Onr+ROc639FU5RbxHbm3VOli74iEjKU584+A7IT2Hsq/vsu/2+AAA="
 },
 "a-125346": {
  "id": "a-125346",
  "n": "徐",
  "en": "Xu",
  "hp": 6,
  "items": [
   "lens",
   "chain"
  ],
  "passive": {
   "k": "menace",
   "n": "拽住手腕",
   "d": "你的实弹打中对手后，对手下一回合用不了道具。"
  },
  "realm": "血肉",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRtQGAABXRUJQVlA4IMgGAACwGwCdASpAAEAAPm0sj0YkIqEhNf0bMIANiWUAv2wzgVJ/3Ga7j/uXgP5L/b/tvxLOjfML6/frfLXvJ+FGTn/P+gZ8B2MQAPy7+vf7D1AZkHevo0/2XgU+Ueph/dP1I9gDNy9M/+r3Bv5v/aPTT9fH7i+y3+0zbLit3Bt5WWLk2PEwPaFuFuPXMcBd/Z2pUg1lts8z/QiRpU+Gxc4nD1AVvaj4sr1L/yU3+RbWxQ+81rPtmd2/xmPqYri1MOoUWtIux0FIfnSc6WdnJb1tN7qpc5u+ZTO3/Cw20Un4r7GigQj2pxqujAD++vp3sMS47/1qoOnzsD8jwdH2tS3EBV0+ISfgta5AEvkXwZrbhEen+3bTAYMCqEv50L9bg/DBXgH7WnQupy3Sg0ZH34aYsKvFXwWLIC+4zp7B9ib80muRa4f0fNoniYR6W36WI/H89OJMBQPv+4LqEj1RphgOCFR/JK+c5eoAq1C1CzinQyogcpcs225LmX8e0wk1x9adq6Wb6cZp20UjLJ9Wp+N3pMcX5aG/Re3XZPgAn5saDu5fmOlqSOsDWdGgA34YyC0mFxbtTqaEXCDgvzRvZ1EaxK93Dy+QBRG693q3op2EVsChhW+OtM4cE/yY5qAT2Oc6UH2bC1MTy2DtdNe+Cz9AeMrDrzE0nTx1uKHq+he42BkCGEjbMVhWmgsP4KliZ5x8lj9pVHDGuHdXi79H1K3I5lM2gJ8+Evudmom418PnAO/SQwRSmPghaYfTrNPS1KRZqHRSKhMkB/2hgXAb3pjNbRBRxPsZJ6pXe+mDqXA4btKh3s/EHad289fTKccZEO3cbV1t/JhFvyGjYQgdgbJ3reFjdyXf91xUefwtW4QmNj3Xq9u1M+dQ5DnMiri87oHi5eiPjzaO4KDCFPkM3Ow2mfGZLKYh5N5AtqHq/ALUemmAC7e8puEFpwk6XyjUsqr+DDVnxmB6smsxo1rbDKF7U+udQiwLTpITWmk9VbMUqn46anW0165UzvDhVBwnj9lHr+ieZ9+bVDQOZbnp3fZlShReBrNvI3FaNFJEu9wVj7GF6nDof4UzHF7bxDVBMzRyAdqzr0PTnyMIyU84yPXkNJ6ZAApWKGmrEyyKnrsZiTllzUbi6bAbMiXS4Y1eJCHyrZXhsaYP/0sU881mtc7qZdA05hTb3XpPbWhicBnpt25oF0gTcv9lLQCjXZ5OXPYo5CfceIoK99u/3X4o4hcy0Xq8I7jgYDPcHem9OMcxA78z659GMjvAfqVRUPng+HU9WlLG6IKZWACqQFXafaRI2Dfr04u8O4XitxeIMwDvrb0wyhyXqKBR0ngEfEj7ndZTW+maSxfrf5Aa4GYqnW9XVI2uqPhlaWcOXPrZXt3kKBezP7GZ2s6MVKq6tWMIkUX+WRmezGqBB287ggUo3XiC0Kue7z+QR4bUgUUgqzoalxJl9dvWAPorn+/CkLL2nyJJdvTCuw4StQGeVv11z660DburAsmskYFwW4q1T16QuMqzwPGQdfkSvncQ+wPFBuxMd2dFRdBV+T7VBmuFOGGx8FiP5VHKFkR74smld9w5TgD6YZgBZPPpKOs7zT8m0XSh9wQlJmgW5kFhKvuSSMKc6y+pa8UIn57TnIu/Cg0I/vPZYRtNFRtmbDc3+Ke9JFUDrmurUpPdfdY32v6sA536KcrwyCY5MoaaeG9L54iB5B7xwFNUAdWl2dnf+LJ3zd7reuptTMkUm2nBXs5d6WnzzoWJykG028WVrtqady2r3xlm+rkUPvwqGjWshuaWM8UB17C/Np9ZJ7WqNaRTYx1abcOmpMvBx7/KZMSpFhrdflfsAI3d+3aElM4M392yhWMd0+SZpf5uKZ1FwspdovmYhTua8BuwZc+pH/AWYJ2+EcMsjROmS3Z9t0SkRKq5m8oAkW+yX+sLTsLTLwPCoJu5/Q9mPr2qh3eXi1inE8NxQzqQK/nGNa/6FvWOB7+5TFHuSjc/kIdp4raK41jQ/Z7Ph9j579XHEGKQ++qBssJCsWuqbPzaiKValwTPi5JUxmpY1qKyLBJKBxVvI8rY2EP7Dv7wEbIIBJ0HMWC79+RigJjp2qRk53AwqQBZQ78e0Yy0Xq8c/CWLjluBVQlGbO2vbSYVrgeuUHOCFiqUoa+qPSxmwjRJeRscsJQzh03JAtjaEn5LqY145WZUayCBQugCmxutWSLLwhwxTyhtfcUnQ+2/Pps3zbGCteFloffxeLL/XOw1o1NIRsf2N2Rc6h6nL64IbY2KzIfyrK93XjbeNpv9dhWbj1x2BoiXWcghc8UPoce8AxTpaAAAAA=="
 },
 "a-130226": {
  "id": "a-130226",
  "n": "沙耶",
  "en": "Saya",
  "hp": 4,
  "items": [
   "scroll",
   "needle"
  ],
  "passive": {
   "k": "precog2",
   "n": "血脉记忆",
   "d": "每局开局自动看清前 3 颗子弹。",
   "v": 3
  },
  "realm": "血肉",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRtAEAABXRUJQVlA4IMQEAACQEwCdASpAAEAAPnkukkakoiGhM/ZqqJAPCWcAyyQd/V5qJ3jVLvty0eCvHV375mzPg9Uewd+snWM9Gj9oFVngel1A4dkf+TJ1RNOhb+jK+Twl+6UoImAStIcfk+iGpmZPcmEQi1uerpick6ES3s9bZiE4wEiho68uJfwvZBYX4JDLAm0dJPu15RLZSZTPpMdHkSg8azLnFSgWJOzsq5eutrXIVAAA/v0Q6B2iuktZVuE8JhzRt/zF2C0YhwlZXLsBa4bRtk4bNqFDuCvwSAvOUtMqzJczMQJC+9rpAL4pyzDfDrQpe97/DsOABNC9wuTdncympV++Eung1hllsh2rjLv7c4PmhWnE2EJRMVTBa0WtNur1V1DDfgzDQWnumx4MxkJ68b3FuUDgBDzmnZ8hljthgij2Gu7DeL73ORLib42yAhlx7FXt0IyRtR8DtAlZPdH8+k3T1JzX60925hjnT+bmOKBg5h+A1eNf52OUZSe8c+AiSL9gGtsOgvvTymLIfLi+5odUXS3R8oJA6MWEkk4fnL4r5ltFa8rvRZEmvG8z6uYVy8l3weFQ2xefmp7rcfjcbt9lN37pM1A4G+cQvrsdtjunX3I4vj1Np1HcCVryrkq4dd3wtgQeZ9u0LBJgxvAwWaIpYbXun1vtn+09j4vxbvQiGeDxwutvucuPb11Zoy1c21ffZOcxjJK/6+9libiBrhphMDoQ8TbEKq9K/rxTaVONWiSzq2aVtHr/IRvrfOfvuO6HEgGDY14b3SXysbOlGcPaQWwpTFG+gzPRFOOIQz0oMduGyW1YrSkFoj663CAClaQ6f29f64N6/94QuZmAQgAP+5IokwMU38cboQ6s75y/f2IXyzS0ZKPT2/R99/YKSM+9p2fwwWygjj46c+fABSYh1wIIE2UzEyMI3/RRhdjkEek0OEhZMK0NZviAcVG6CZl+DsEJq6SavGknMs1R5GD31rEPggcAbACEfK74z/YSqqMtZvv+L53ai5bPqJn9HThfcQZZAqt6y3hX9by5WW3/O5T/4iM7W2jzdp3eVoa3IEm5GEQuNRArSkoBPjWKjuGefDaBS+pDuDjm/Qr0ivLAqHty23s28wNvZp4RK1k3ir/lZbt8SDH9aWdBOIaiM3zPX2GctRjirQYw+bi0gCHc/fwGf2EOLBkXFd3kzVCjhb49KFF4ppfg9TPjkN0DDsaQlwSgkY2O+owj/cFlFHi25jnqDF9/i/30F3BHSab8gKP0aL7vTh31hW7+gH8o9p/p+yCBmmQKYda/P+CfIltIVtq1e+GMMreJJ6quDCWAkOdW+pRZ0Pxx3jyLx4HYxeLGGKI8iWvGEEtnGyjaA3V11Gu4kayi5sTKct0VuK8R3Q/fhNwlf7/HO39cQWdRZbT6UKoIVaKezN4bpyPGvpleDvr6+vSViUkbyxDOzTwIvq2QFGHejA/rOiaWAJWNFyhDujnzeSYiHxrt7cmfphUvvA/P8UkDx1T75zSW/9+80SzwepQLUkk/43LyPwfZgWsOV6aY5XVgfy3Y2wm5BhZW22hEoTrkwerqBrZQgUCc/e+S8rlfqyOfdWdoDo1QPz/rc+DvltbllhP/eZwYvgs8jm414M/2P2q1qyAAAA=="
 },
 "a-15596": {
  "id": "a-15596",
  "n": "泰旖丝",
  "en": "Thais",
  "hp": 5,
  "items": [
   "needle",
   "chain"
  ],
  "passive": {
   "k": "echo",
   "n": "空壳回声",
   "d": "你对自己打出空壳时，从桌上再摸 1 件道具（每局最多 2 次）。",
   "v": 2
  },
  "realm": "血肉",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-77926": {
  "id": "a-77926",
  "n": "皮克曼",
  "en": "Pickman",
  "hp": 5,
  "items": [
   "lens",
   "needle"
  ],
  "passive": {
   "k": "extra",
   "n": "兜底",
   "d": "每局多拿 1 件道具。"
  },
  "realm": "血肉",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "c-zerok": {
  "id": "c-zerok",
  "n": "立誓0氪",
  "en": "",
  "hp": 6,
  "items": [
   "scroll",
   "chain"
  ],
  "passive": {
   "k": "precog1",
   "n": "手感",
   "d": "每局开局看清第一颗子弹。",
   "v": 1
  },
  "realm": "血肉",
  "role": "辅助型",
  "line": "",
  "creator": true,
  "face": "data:image/webp;base64,UklGRr4FAABXRUJQVlA4ILIFAADQGgCdASpAAEAAPnkwkUakoqGhMBn7AJAPCWQAz9BYTrJfPcC7QN5ZruP8B4K+LH1ZmRYt+kO/z/X8J/wT1AvX/+Y3trKP+641O4x/1Pqd30FAD+X/17/gfbB9K39R/0f8V/fPSh9H/973CP5l/XP+T61Xr3/dX2Zv2qZ8imYcNkK4jGy0ACdCnzHqlzKwFaTzNfcBkwOgU0UkZukCJI4Dh8P4tvKDX7J3SxD4wX9vWXsWBWK/u7MSI7GiGs3UOQRouEGAkc3lspNUHuNpGg07Hsi8U6gIySA64vtvtrwAAP7/mEzxmSLPlvy8NgBwmtoOp7XKpKZz6vLehf4NN1rAeEOLJijKFQ4qC+Iuxs1IrK8DCbGu+iOhKI/4uq54x9pTcxTd0bhvBZGojnyWLJM/GKmnUzYCzjkP7AMJEJJgBj7LztkYSuCjUDqfZy43L3a179HYoxVbhufzAJocN//nMf4/+VkNpE+uvZpQ1NZ3mEpRSDhEMcO7W2EzIDnNwQF3ekOM0n3DPdDOUlbys/qE2Rk2JthoMgL9JoUtYzno3JaFg73UsA77aO3eaP0ZnQFnU8pzfZMUFu6GA1Sv3lSp/yLlVbCVod/t22OF8q1eczMsv7vRVv9zgHsrUeIr/1J/cZlGn94h7APIA7incKPd3//Hn/PWQUCYkfeLsojtbo6pgCB7N8N8KTvRD7PKcQCus4mUvcWzrC3Ndr8ARSYuncPHb8qhd2BmXJ5bv2xBE9N9cjxL+UwcNCOK27+L8HuZOCTzSQZAYq5v5F34t3UbTZooclFMAA01Fbi8JAfaGbS+k2m0E0YYOWFQOL7C8TbPH8352aS6veAXu9jZVOhBAxjBGy8lW19MU2bMmFN3KOp93RPJ1ks/q8e7QjG8vVApjbfq5W115OypCsujej1iOeKZA7gcMjyP5ZKKORmRy3OLEmFG+QE/vW6c5s9oY5AiiNIhmAHb7MA6kiSBZ6alCkaTIEYGTlJopo75kZmw/waAzi8GP4vlRgA624B9j/XEWQt9eXDU1hp4xTtKp2var8pZ3oBwWee9P87P7S6MtaMr2Zv1Ei2oD3iMG5n5AC7395glZ3QFtIevfC9AMZCduyogvDevA6VjFwNEn4H34M59+lfXfDvrg4P8ZdE5RMFXQXXe56QZhADwa+5LKTys4+KMRoM0Cs72uI8oBSs/InE5RyOptDBFQm5beKd7W+XOB3VPNm+51CXDwn5D8CtXXtgcNgikZaAOxTcL9j6ByYRrq7c/FzI3pfCdkpT411uRHLp3LeF1w+pZWFsCKY3O6N6w0t17MQIjYsNHZP9838ef94m6DE5tI3m1qncwndGXR5UJva9hRGTf7k+i65Gh6L4S7Hoycc4foBKJTMdF7FLV8vb8fDk/7xGnjixH40FfYNjoGtVxuPzS6bMyelyEYv38OwBcJKu/iojgRfG/2/SZWIbXlpGanjf3gTTrXviwPDBt8RX7Z8EV1GlYmEOp3l87TNh9H3/bSNMBWJ1l02V2QjrAw+87OiBAtWawUh5EbtStz2tpUQBhbsHxsaz4tRsp+ndVmPiL4E67q4/PejUj19dpfpSkyUUA9AKQXvGCNm7ukLcZhYvSJl8ScfwJb7/oAPt0PHcN8qMcB/cs8+p8Qy+TLhw7Wypx6thOwLq9oPvjD2DbeGptCPT3ukyL13A8//gRj0qjLrfchsbBp2tsRkXa5HTipEQwC809DvmtTbULBJ2UTCP1nHc06vJLLJMVLaNT6fa/kATHMhli46kKmNUYXxOHj8DeocJs9QB+zEYhWYHkXuvY3g+f1Omc98bEB1Xs7KoseP+vfW3QGY1RxqlP9FWudgwG62UOvlAjaosvhXQHKGYRfVYTpynzm+wt6+YaAfL04/IMZuvwb/X+hvzlpm2D/hqyEOCr+uNuLQGDPg5+IM6ZOB0butuoAAA="
 },
 "a-15597": {
  "id": "a-15597",
  "n": "雷娅",
  "en": "Leigh",
  "hp": 4,
  "items": [
   "needle",
   "needle"
  ],
  "passive": {
   "k": "greed",
   "n": "抢在前头",
   "d": "对手每局少拿 1 件道具——桌上东西都归你先挑。"
  },
  "realm": "血肉",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15563": {
  "id": "a-15563",
  "n": "图鲁",
  "en": "Tulu",
  "hp": 6,
  "items": [
   "chain",
   "pill"
  ],
  "passive": {
   "k": "menace",
   "n": "缠住",
   "d": "你的实弹打中对手后，对手下一回合用不了道具。"
  },
  "realm": "深海",
  "role": "伤害型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15573": {
  "id": "a-15573",
  "n": "奥瑞塔",
  "en": "Aurita",
  "hp": 6,
  "items": [
   "cuff",
   "hourglass"
  ],
  "passive": {
   "k": "precog1",
   "n": "潮讯",
   "d": "每局开局看清第一颗子弹。",
   "v": 1
  },
  "realm": "深海",
  "role": "伤害型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15564": {
  "id": "a-15564",
  "n": "戈利亚",
  "en": "Goliath",
  "hp": 6,
  "items": [
   "saw",
   "pill"
  ],
  "passive": {
   "k": "siphon",
   "n": "分一杯",
   "d": "对手自射打出实弹时，你回复 1 点理智（每局最多 1 次）。",
   "v": 1
  },
  "realm": "深海",
  "role": "伤害型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-130901": {
  "id": "a-130901",
  "n": "莫丝",
  "en": "Vortice",
  "hp": 5,
  "items": [
   "chain",
   "hourglass"
  ],
  "passive": {
   "k": "grit",
   "n": "咸水泡胀",
   "d": "每局第一次被实弹打中时，那一下的伤害 -1（至少 0）。"
  },
  "realm": "深海",
  "role": "伤害型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-77922": {
  "id": "a-77922",
  "n": "克珀珊特",
  "en": "Corposant",
  "hp": 4,
  "items": [
   "smoke",
   "pill"
  ],
  "passive": {
   "k": "lucky",
   "n": "押对了",
   "d": "残念药剂对你必定成功（稳定回 2 点理智）。"
  },
  "realm": "深海",
  "role": "防御型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15594": {
  "id": "a-15594",
  "n": "凯刻斯",
  "en": "Caecus",
  "hp": 6,
  "items": [
   "pill",
   "hourglass"
  ],
  "passive": {
   "k": "extra",
   "n": "拾荒",
   "d": "每局多拿 1 件道具。"
  },
  "realm": "深海",
  "role": "防御型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-141302": {
  "id": "a-141302",
  "n": "庞托斯",
  "en": "Pontos",
  "hp": 6,
  "items": [
   "aegis",
   "pill"
  ],
  "passive": {
   "k": "greed",
   "n": "先挑",
   "d": "对手每局少拿 1 件道具——桌上东西都归你先挑。"
  },
  "realm": "深海",
  "role": "防御型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15592": {
  "id": "a-15592",
  "n": "珊",
  "en": "Sanga",
  "hp": 5,
  "items": [
   "smoke",
   "hourglass"
  ],
  "passive": {
   "k": "siphon",
   "n": "分一杯",
   "d": "对手自射打出实弹时，你回复 1 点理智（每局最多 1 次）。",
   "v": 1
  },
  "realm": "深海",
  "role": "防御型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "c-banxing": {
  "id": "c-banxing",
  "n": "半醒的鱼",
  "en": "",
  "hp": 5,
  "items": [
   "lens",
   "pill"
  ],
  "passive": {
   "k": "armor",
   "n": "潮下茧",
   "d": "每局开局自动获得 1 层护盾。",
   "v": 1
  },
  "realm": "深海",
  "role": "辅助型",
  "line": "",
  "creator": true,
  "face": "data:image/webp;base64,UklGRpwDAABXRUJQVlA4IJADAAAwEwCdASpAAEAAPnEuk0YkoqGhLhkvGJAOCWoAvROhfHe8fkt+JPUmRVyk+A5nGPtm4MDqVd5U8kBozD10Fwaf5LdQPpJJ3a5XI7sAe6M4WB/Heil3mIVwabHCEVu523GA3gq8ap+7l46LsSi+wsJ7gfdfUS70TzBjIHMSS5yRyMDF2Kv6lw7itSICZrkWr/78HMOUfx8BShLvY2qn2Dpw0oAA/uvJsEGkXXfd6eiUT+H/6rW/jqz/PiKR//Zt3nBFwuRohrrORLLquQZ/o0A/3Mv+aqfCgT/hQexMxwH7Q54AiNjFEJwgEeYFqZuPh29qA/azua+3PcUuFkxNp4gPXiyAcQwCeH1XwAK0EqrU+V7jyBw1S5Ftf2aXh6/ZTwoyjejyX3qEMVEQLw86/3NquMfnd5aAk9LAaFkbY/+c6evCg7N9DJVYyzJF+6uzrK0D8wHfpVX5hWk+FXCPG9OvZU1TLa65Bw9iY+7UDLj61eilDpIdqizAaZmtzLdn/g+/D8T7lo1aSiW2q++LxB63GKoVXTsYP6vE2JPMhSQAkD3Z8XTb36O9QKcTL9Kz49Jknh8gjcBD5lnzZ3Z6OR0GCpdIGHvUslL5/qxSkpOq7dGITv0Ows/Bue0fkD0JmpaO+Hq3NCGyCKyXEov01SYdAgYHh9OUgQwSco2CYUTXSxL8MKER7WTLkEjesUYFLuwTQRoqWmnIhX/YqJr1z7MOF4TkUo4MWkkt1QxMqsTXTglaLExZ8uzNGhLIWMnVHwZf5zp5FCpANVzlebo4SVac+o4XGkBnR4UWagP7SGCsctlPQx7EJkvZs79//3zz/5weODSpSNSFMZKdl8Lkj3ICwRq8zW00NLAB9+bPCyRI9pv7FsYY1IOjAxnaUgaEsTAd0QQgHsJOY4U7XyB/pxe5B6Bayu1zhEJAxIVONmOLBBxYUBtmrU3OooiWQKa/Qd5OMvYIq+u4BEMwmGcipDxNUo2VNIXavDwM97h2O7SWH3EyluvL8xh/+XpkGc486F4/JjkBI2CvChieBkPHhKEMGvz460Te01KwTCRn1VD+b+Uj+1fTDF93bvtwAy39LgLL19bG2AnPTJBY68YQGdf/VH2JWf6NG4RbG8nbZ3QCCO+7xpAlwQGDX6v4AjorAym0SJXOly0eALeJPklEMVJv1q0tnPCpK29PTYOsli8icfbYRwf+XCkU28gCwXgywAA="
 },
 "c-xiamolin": {
  "id": "c-xiamolin",
  "n": "夏茉琳",
  "en": "",
  "hp": 5,
  "items": [
   "scroll",
   "hourglass"
  ],
  "passive": {
   "k": "menace",
   "n": "缠住",
   "d": "你的实弹打中对手后，对手下一回合用不了道具。"
  },
  "realm": "深海",
  "role": "辅助型",
  "line": "",
  "creator": true,
  "face": "data:image/webp;base64,UklGRqoEAABXRUJQVlA4IJ4EAADQEgCdASpAAEAAPnUsk0YkoqGhMfjtsJAOiWQAuGNyDbCizQHg74xvaZ/Z+m8pO+eUiZc76zUsVkI7/Q8zuPT/sB9J1S/Ozs/zoLshRGFh+32R19J+7ck3gd6FDU22krbCnSi4+DkepHzzBVDenQfRP2UPa72aTIs2harx4X46KXyfjvWTTgxuJ0qjC/Oe70GJIHC6OqWCCvFfzJ6fezAA/v27sacnZvJq3dDpyIi2KetRQypLXOVrbqjnP/0nCbWyDLRYQbqWbWsIXsvd+lLl9f95uVazJkAvz++tUMI/8P9aCTP2pwSqSEJBxbpUncZwWN25ijFYhNj0ebPGm2KYHYqqOW7vQNCz7bNFwNSP9KWgDqkpWWD32PQnfcC3c/Ziw1NPkB8NhGHF12UWKeBNMKLNtL2P8AsyYR73GkROtydF+r9lPHGsAi8rz8sG6ch+u5T98j+vHaSkP4pb7p9f26VpSwHf8xH04mF5SkKNERs2zMCelbJsiXzCDdqVmdhJvnjeR0Awt1brHF1T4He6Cm+PJCMelhDwKDflq9TvSxfee150Pvrhsi2+M4tuxdrBVQ8HDYgveQvERnCMqK4yeh1ufFR4hL5iQQG5v9j7dtcf/1Kz/mhleGLgbbOci1BVu9Ix4oxeFohD07QOewT2qRVVX86lx7AfrmCrXjo88HQ/isYQCHJDT0N8i6huQv16QHnzWgVAMnKAdKxPAXKbZW5d3/BrPCdsfKZ/CywcgCdUwRfwBRmYAEtmHmaBUYyD8rAryZni0ZlefiIeTnF22Vh8Xdz8/6dhOwlmVd0Hha0YAieKVXuTqizcv3It8IGnQx1C5Az5OgQYt4ZDc0gHJGTOayKDs67Lmm6bKRf9WaN9pltfS4CcAO1zj4X4FxM4M6IgX/UtApkJDF99SYyBTq+9/2FB4WdG5qWObQJxDv4/m4nCQkOFvIYlfAaZ12V+wF/bDYH+MW4MELH7jeDi5tgnMgI28gRurrf4PKDwKSmvAuWoOswW2zfwz1nGdCkAn6bq1XnUEp72Qc3xGbfkFN+KqH+c6pwUnquOfVrChOgRuKUI3tvRbMoOnU7rkywyRkw3ioa0N621+DIzPeOQstAdvpaNcC2Hc4id242QuMhmTKLILxBNFxI7rTBut7pDHIR9Q2KIys59KCQH7qXxtA2K0k2+qArm+Z8ZY26MXhqq/iYafXExnHhM8SG26i/rRvLHfcaYibyBLwdAZqXcA/beuAMvEuhpIssQD0GZjx9/aIUGZoxz+jTVAdwEmmjnlBbmH10EQaqs5/aLDSlE1/VzvXixhQBKQxUlWj8jezfTrDnFygBUFnLdjRaFH9Rn9Si+E1q3rOyR0Teb2mygg6zvJtDVB+54ZaZ3j34TzMiheY8Q1hUNKtjwDToLYCeEBoRNmfdWrkTUjmDhy6/BA0CIEZVBSAPD2XejjC6M4qcRUZTIFCEQ1jMhVtZz2Ddf0gld9uNbQNyiEuuKfrCvxcLjcArDyzThc91bERSWEog2jlSo34mmZwxAGPu9omrwu+zm1sWSiwUjv05Ur/6imJBV+rxgQowPDK1IAAA="
 },
 "a-15566": {
  "id": "a-15566",
  "n": "希莱斯特",
  "en": "Celeste",
  "hp": 5,
  "items": [
   "needle",
   "pill"
  ],
  "passive": {
   "k": "precog2",
   "n": "深潜预读",
   "d": "每局开局自动看清前 3 颗子弹。",
   "v": 3
  },
  "realm": "深海",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15582": {
  "id": "a-15582",
  "n": "弥利亚姆",
  "en": "Miryam",
  "hp": 5,
  "items": [
   "lens",
   "hourglass"
  ],
  "passive": {
   "k": "echo",
   "n": "拾回的回声",
   "d": "你对自己打出空壳时，从桌上再摸 1 件道具（每局最多 2 次）。",
   "v": 2
  },
  "realm": "深海",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRpIGAABXRUJQVlA4IIYGAAAwGwCdASpAAEAAPnEukEYkoqGhN/gIAJAOCWcAxVerWxByh+uMWDuRdCeYv1ofWeYHeTth7ruAD83/pP/D4w+OXvhPLvYA/N3/Q+4D6X/6z/1/57zffTn/q/yXwC/zr+z/9T10/YT+5Hs0/ro1tsrA0OtpXBYtvcE94LYuM3htmShSXyA3v3dtCePFTBlul3/aGPrK47V9M1L5epx2laz4Qxb26QQhHqz+oJ0obphm+GgjXQY56hcRdsRu7n+iFn2eIbl9AJJ9oHBYGf1fZ3UOClan/tcqNwesmy07Z2ZCBA1wAP7+pcMgmSbIsZ1QofX+ZZyUZAkY07p4JwXVfJqqLIWVgabc4/Eq0z1FOPsQv8RX2czBxs/afSc6k0XlQ1QZh+KL9cZZiHjJyTxr/wBVHxLRqA8ZYW2Xt3JSQQEgn5C0FrVz8TfN81+PypnDhYQl++/yd4EmfR4L7HCycdH64wF+hYVbemKl9g8ElvVqIQKAZt9H8e2nz1pCkCoGTGrUg+IIBCaU9VmyOo43Q3eehvs4cJw26Rt2msHgSPr3/BN2IG5CuZsWlFpE1saanT5TvAp0xCMw/DHZJtZ1VR/XG/xg0yIQtks4ZLTcUDa+gewvX58rJDjHZrK9EpWTq/4QUl+PaYxFRUxsNck5iwsHrZj5kXZVnVcEm11ZCTaMaZGevoyuGIjrdJMOIGxIVtlqeBk/6Ha2Pn2YeF7+aAqzhDztpsON7OjYr7Ci12UPRhoHBMk8O2EvtH0RMM+aUKUtbDdGy1eyQ2HyeIE1dXiQ+IHcLNZgW6RJTa0+W0nTUfilnZ7n7iAdZm8YHwVuH+OYx5YC83SBX1eWKH3Fv0Ab3y8WT55MqqI1UuNcdrnq67V3BKk7ZBupwct2F+PlEQVBUnvI0182vBFj/LmkuZqeNT0aZLRUxYFycdoXx7eR8IEa/IoTj2XZwBBMwDprRg08Mx6GJb1iq4LvXyIaMqhHvf1dekPZLLmwygkTxp+wvnwhR4oHuzCtRH2Ox15mhMhX4Fz54JxIf0C7tHToEFlmRlVCVbkjXbPs7ka5Y69FAhYkLGwZY3WfslveHGnnao9qdZtHjoZCOXBJWDShWf6Vm0+BzFPuikoK/me+20iyaVuv/+3bUKlJ9RLORoNjOLAwWqjBehjYdPMhUAjrRGNqS1O1Opo7a2RvxK5ahCedI6oCL05FZUn6bThSYcifT5fItQVQe2r752OMetFIedwNBtOUc2Fky70Gde1Ks1F+uxX65y9sZWufe9utTF0LgmKZqWbZ9kk9PX/883dFYNOV18KZh1Y6WuNgETszQkqEdGVAasJx0oxbjP5rsMoHE2Ux90X5B0jSJHSNNwc9NkYRorllaXxosZVQPqgUs9VlpxdPCHrAlMT68+mR3K2rSl7rPOnCbTo1Q6hen8Z1SqdmUOQj3nQm9inqqUNiju2ei7/+JPvTDczNVF6tg1t3GhXdc7OcgcmC3Wurfx2JbnuXWCQimxI7XmzT5VG5J/9pZHmlzLwtp0/o4pub3nFCKvM6MKHc038oFEpqiO9Z8kMPvBDOO4Phf4rNtkozkGiUS+JRYarYbrG+X15PWsjeT0fl/Jvu8F+0eMjH5/4L0vFT4HK3Mq7G1bjt4ZuzOjoeje0g+a1iQQ4KfYo5RLEbt4cjboI2JHaYs86qrB6VXjICcVsXrVa0ujOl8kpMtmArrFsPFoehXapDEqji9YLCv3SQuNr/WzALsOX/PBUvpAnV0lYRll3qBXMq+9Vb0uIn/tKe3VxcOGJzsjsqNGqX9Js9A/kvvgF5WpsmuhhoEdYOfiC8TyLsbh0lVfO5x3O8rv24de+XXC1hXA8gff47kkDD/eqDsrbQq/r5pP7qY/APYeaag2UTOVwAgRkL99MxhnyJ4F9nBIYfOUQtTeRXY7LCLdx7UJgcBlm8iP2lXVH1mxOxHv7JC5FvBtV996zm1Rsfl5cmjRYuh98VWf/Kn4CtQ2YEJQyOP0Bi4I7yee/srw5CN99yDuBauk2t0hJAaCnufnGF7RwLFQeD0nE0VyyjS0c+JF1F1izda8jglkXLF1qbiqJME6ncxaVtJj3xWlPW9gfD6v09lVKz/uMbkloBsakNe+/zPFXB+we7bYmTPWQXfE5KdRQ/I7o1JymfI2jWHAh+lFxQCFa+3Oua+iwEc9ljXncNyJMkrHq7ABUGrUcMVDE8OlUwhIPfsOLoZ5E8MwAAAA=="
 },
 "c-mengyi": {
  "id": "c-mengyi",
  "n": "梦依流苏",
  "en": "",
  "hp": 6,
  "items": [
   "scroll",
   "pill"
  ],
  "passive": {
   "k": "extra",
   "n": "拾荒",
   "d": "每局多拿 1 件道具。"
  },
  "realm": "深海",
  "role": "辅助型",
  "line": "",
  "creator": true,
  "face": "data:image/webp;base64,UklGRjQEAABXRUJQVlA4ICgEAACQEgCdASpAAEAAPnkulEckoiIhMBQN+JAPCWkAFHd9q98Plf/LGimk2FvUOVVDOfIH9b+wV5Znsq/cD2Y1NtZu7gGtyDU26vqRlUPj7o4gWA9GVc8CkvzSWLeSUtga/FbMM2gL25ntwk2hlHR3V3AGCr9jKTD+E+lOxb3Y9oUMaq4PH+JX3eez9NcAlafzRXdahWr+/EbCJLrESySAAP7+tdNyFDeJo3GnQsx3BAfDxc4Ia9qZ4aWfcMrg3zC3PDyxOuedxY+X6wxAG1t5t9H/MZJdfI7iHkylVbNwHF2Vs7WGTlhXSeM2tHJV8QMUlU7JlPvq0qojuWeRKik79t9xUFUR75bJsozY4MZwXxVCJmdEC4QeeEnCP8vKKTMyFkjlNTGZjsmrdhtigrNF2AVr+S8MgSmBYA054EPs/VyYbzEw/n+O4UMigD1y+0sRC9gUVXNA77o7d4vG1mZ1lLjxNCYM/9lOUy4ocb/fhxWDBTIRw5OwticRXhBQMZvK+UtjWdfJnKLN/T1tU50HBWXkpzETsZygEB0hVLcd5FWYVyX2ZcT/zi2TIaAb3iv5tgpVVdHw8wSozhf6WcvQGaDGpOxAhTvMbqN5bX3cYIbtNW0kCFg0n97VlL790iT6ksAJO+4Zg5pZOA+vsFX3/3NFFIzNcpG5rAOg4T0wd1dR54q/DHvCDhK84sfd3dCHkAPs2SUXMgrMsGOeVTUzomBC47CegQbr3XbV53mmoCx2VJKNu8oVYxKk1GpRF3CG/+FCaMgGXmVFVv88oCWcCg4DFZ1ILR7Cco9QJ3g4jC58mSh9SSc/OzROtZ7mkE1DMbabJGD+1/YU29MfbcHIiVf2Vvmd9yoDnTgpTSBQERDB4pYb1R/9T0eamSBfWuZRWDJVwgObJONPoU2a5+VFs7vlhOySZhIP98sRctDgFc0nCUDx8erV9qUoSJScoFHCcR6Q4SatBbZ116Ix07aLPAUhm7UA2iRoGPOMizIbTyYQv71yxftd68hcDE0RGiJveg4RhUOtp3TsNi/Dy1Eve4gEJmg0po+r9KjIzrC3QAQDnjQSPIIhb/ZqFbwmHuxQvgxUQbaA8WSnl5sgzDPgpNa6+Qqata66uniE2tz8044JyZaarJeOr2WojPWmbq9g7rRZn2l30drQzJbR/RfwYvRkqY0yUWOEkIH27j8B33Il1HJYgr/8+9itkhpx8YLlBaZ1Mohqlt1VFerVnLID2rKHfeRU24fkZdci6zkckY2TQm1GgMcVMiU1bo4v7XjT7QeHq5tC5bx48J8Ck3SzX2+9yKO03hlniHerhoHUKj096hJ/k6WfaPIvo+AwujfQNB/tUtKn1UZldJp5J9ZNI/+5lBWJU6//Sb4UU9fYpd8xvIWb5qfB4Js9U0La9Kpps5DX85gjoAAAAA=="
 },
 "a-15575": {
  "id": "a-15575",
  "n": "法洛思",
  "en": "Faros",
  "hp": 5,
  "items": [
   "needle",
   "hourglass"
  ],
  "passive": {
   "k": "precog1",
   "n": "潮讯",
   "d": "每局开局看清第一颗子弹。",
   "v": 1
  },
  "realm": "深海",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15589": {
  "id": "a-15589",
  "n": "诞妄·墨菲",
  "en": "Murphy: Fauxborn",
  "hp": 6,
  "items": [
   "lens",
   "pill"
  ],
  "passive": {
   "k": "greed",
   "n": "先挑",
   "d": "对手每局少拿 1 件道具——桌上东西都归你先挑。"
  },
  "realm": "深海",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRpQFAABXRUJQVlA4IIgFAABQFQCdASpAAEAAPm0sj0YkIqEhNfouYIANiWkAzvOqnvj+u+Bfhq/LtH2W5rtjT1R+9/Qv/ufDDoAfyj/O+hnnK+pvYJ/XfrTeir+2oXrfJHrpC1WczpuaqF87rnybqUUiDz184sU8yZz/ZqvwYsbWiYxf/OflD2EdaoUI5xRJkMPRtw6lR7RQigvRlZ6xytulma9ShvXOmd8NV10isyl1Gb/fLSTL0sOTST6rbwPwNVXwoAD+7zLR9u5L7feEEq8USyO8Tz2Ye/4iXbGH6w//SIE+zFil4LoutFWd+2ncb1vCZxt30dQqdQjteVWGj0W/B4MJSr7wV+yKHL4+tWpVxg46WOQ6FZmd/UjsOJznRTzMiV8uccO8Amd4LyX2FSsNjXVDSkdCg3bijdde0LmZgoECIyKe+sLDLHYg4DcmTu9U+aeeZxZrv0RjWpk3fNZR3jHlla/Slfsjnxjdq5w3c9S2D19+71vL2IdVmvo7NtfBAbsIpEU6evxHIVINyMV2TM+O3n5ufWvvEgriMTiq/Z/L4WGxnN5QMpPQth6EzuLSIoArazt0PaGTDwj2ycMxzX1RdEveHnylGKNlgcLsvvKYWMLwpKkGX5vs4aoK8paUm6ldkzObH1Db4t2IUczfFLGAkWdVp2b3S0jOmNGhBTUkp9UwL4biHrblkcogVhqT7fzkannkFEOKCLVv6YuKy5eMEuAS4EY/YmK/KbcjPgoSx4ErmTfuSaDgvSMa+n5C/j4WSWPVScot1hipSKMozmo+DLu5tU+w57CL9omXGQ6T9+clr0NQcZUE9sKhoBZOLgvip9Bg4Tj7PN7G03ouz7P10hm8EHKIkoFbGIvAgFUv2yx7agOwrndqzeswiY/0Kg+Qgr6n6kSueB/o6VwWob7UsLlMDuJclOfm5FWl6K9ObQ0Xw/vpbopN6JcyXR/fmeM6Ch3/eEZ2l0A73rxq3S40QjKyQJ//7lPKcz4I9V0kaTfbaF20CroQW6hoMpB7ULc2umftc3tIXM6jtRqM9rWwTsm7/9619LNZ/LRIqIXR0cRuCsySK+U1mLfZYG799c7PAslY6EPIZ0FZzWlsVi7fY9p3T/yEvkJ06eD/8LdiKX67ocbARdNyW4yi0JlirQrEJFAj59qZYA/V9Sme7OYXyywf1KrqjLLJq+9EL2R0Dg5q6ncQTV3rINeTwAYVWTjhtZIw3F216ULpb2L5tFDmkKSIvE3vRJ0VLWC1lax4c7Fu0EIFiYaZe8fwdoNDVHUkXimKcZIPyjsiJHHqb/Ye4pZhsTyZsOaCvwGit3ChVeVJc997B5MuUHJqvUagj3mqxhXqmv8EuXTqtzTskD9pXDd+tW03B2MgzKNbS4qR/iQSmHMsLuUI1mWuKLu3lbN7nWO8/rtQFhKFnA+257i9Afvf35jZcZ6/TPpuwkpwlZ30A7p9T1x431ga91RXEhKCWoU/91L26ftqKPCL6dWA6Jaa9YGQNdvyEjVpaNyA/kFXI/cR4zB38B+xpcpLELkCaPXqLUpflFvUsz7LMeIeGb/QInbrLPkPXtHI9NDL1sze1z64J2sF2ZeibGthGpER7FM/HRwbvTMvtePJbCdAht32ocoWr5LlOItSSyKgKOs+1Hvxijz9cil2+uW/1ZB8xVhEsJSUf4amoJg7AHBmLIMcQz/rvHCpvyLv5MfJ7Bxu+NXu4VJcp1i2SaATuSqkaPOhqfXBwpSxe5FEFfy1xArxHvP/nO8PEnQd6JYVIf/vgpeOtUNjj3ynP2MATj1S9vCn5TNUU9shcNe3uOHmSOfZ02Mt4I98n+zzeXNJwxFX6AQuRfpga3fO/Rlytdp4E+m4cWnOVhRTX7BeiBMoKRf8vHZ3ebq4Vad89A4uUjUFyAA="
 },
 "c-chaoxing": {
  "id": "c-chaoxing",
  "n": "朝星",
  "en": "",
  "hp": 5,
  "items": [
   "cuff",
   "cuff"
  ],
  "passive": {
   "k": "aim",
   "n": "校准",
   "d": "每局开局看清第一颗；每局一次的实弹若正是你亲手看清的那一颗，伤害 +1。",
   "v": 1
  },
  "realm": "超维",
  "role": "伤害型",
  "line": "",
  "creator": true,
  "face": "data:image/webp;base64,UklGRqwDAABXRUJQVlA4IKADAAAwEgCdASpAAEAAPm0ukUYkIqGhM/meqIANiWYAsR+cx5lhC6QdSxnvO8+v52QtSx55k6qV7t8Oqj6BqMEUiapp+F7Da1Z29vcYhg809i5dRzzJQUlfArcYd87xuRFdsRV3FENuozk5vEUZKcye21etYTsUZa9T1t3WGbjmTLsoomrLvgi8OGcnXD8KL5WyGOC9gjVkHU5j1VgAAP7/Gl1+ah47h7GjL9dZB5XWrq4VMVts/6mI5LXeKgwCnsyaCw8CC56neDZyH81OiFFvwjDww+2cOuVM2Nu2jGxzreYGECuqdhubZm7fIChLqb46a4Y5+jyZ8mtgpI6cA35ZSJQAnuy09TCnkSXMy30jMGg8zMlUYod6fFCvVYfbgezSZYXZClVQSazgz/98OavfmcGaDaWbdLtGLe+l2cpAJMDrhR9H+XEgBsI0Qs/SUYkGSKZxmnQqbwOKE/xOCyHxkZysmnxasXZP+KQNCwgr8NNtqarCEUB89PEROuOXCKkyNyAfBwRz2Ga1kzfaa3tkFi72SwbM2qAYJQPVqTs9MCZ41coIcKodu5XPcoc9DYGDUKp1Zu45raOcX+K4JUTRlQpP3LL/diePYDwyTHmaFPIj8lbvlj0wx0mk89CIj3JDBSF2wgqkZ/VZy9cSoUD2a3R/i2NKQ/jZ4Oo603avTPT9D3TQal/pwJZmka+9I0tl89o23xeVA1M/FWhQXAeM064fTB9Z1ANA3HBDvKB749Ycksr7/O2Gro9r6bk7dVriN4iUIID+F7Sn17YGpBZpUDj6j0/LO8gGHbWLgEm149SbtBsZy+pUG+Wt9w5jZNZu+dQQrCFpzqGoDGmTWHv1UvizXDw9DK/VTuBAvNn+IixgMMV5FPUtRFKyifgycGKXybSF2Atkboz/+T/oiozKMZxyC5pvG2/1tMxu8BZN6AmW43ut+E1oShKIZb/rXf87tjwJrTupFc1BshHBvtPFnQJ+MntD1+F9iciKqewY49Za3oAHVIUHVxcgT/vXS0x/V/EmzO41tVXhdbIS0rR4KZzCr1eQFmTRXl3R7gLV8pMy8UZw0+qkWpjC9pyS2ojOV89hgN7SyPRk6vihLwoO+LMifpyaZqkcbDcsB8tF+W55RlSWAhsBIKvTpmn3KoMgZ7OFVSAVx3wioTM5QE9nIW3JWz5nwaz+38JfaAwwrKm15Ls8dV7AEDvCkYk+Vv9kFWe16zqsZkDURixp0IdQ66AA"
 },
 "a-77917": {
  "id": "a-77917",
  "n": "波吕克斯",
  "en": "Pollux",
  "hp": 6,
  "items": [
   "saw",
   "seal"
  ],
  "passive": {
   "k": "serrate",
   "n": "高频切割",
   "d": "每局第一把锯是 +2 伤害（锯齿），第二把退回普通的 +1。",
   "v": 1
  },
  "realm": "超维",
  "role": "伤害型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRlQGAABXRUJQVlA4IEgGAACQFwCdASpAAEAAPmkkj0YkIiEhOf2KqIANCWcAy6uprnh4E+KP2hHauA+tqN3kOtf7vyAD82/sPEJx097fQA/QH/M9RX/t8oP0x+y3wEfzP+2+mj69/2s9lj9oVuaWLZ/Ewuc+o2MaJJPHTJv0LNwaWzVxg9WJU4H8dwRZ83/IX3IcHc54f0GMlQs1N46x00K5zzCnd7QPfzvmtWFUIlL4OK7QBGkIt/e2eMIkr8V5LvX0skag22z0xXSBx7u4snykdjXcAAD+/QxMgrodz5ad6yP05U0UlX0PXFOQoFCIUUif4EcoIzQhW+RuJVLLKqOrICkvuWBVNhtCwZqzkAXlAqwu+egeGOs0bIBFEfcYPH3dk1SQRnI6F8BhX7n15xmnVnEY/C5wndPZB0MT2XDiMZIuPQvWx8nAKHI9FsLOxOWXsTuwrJttInJYtqQhALZcklFhiiWBnmZM0sCVWUiq8lduTNZAMD1hIHFcSy8JGr1h2Y7yaJeboOBC70xCd16fCYW4TcX2llJotZJfEmWfEllAapmg7a/x+UH17HgJAmJD/of0HFnYshzkWtqm01rrmLq3ngNeoF90e3pe8BYoUg+y8g7FzIl1F2hAc/mPEsFh7OXlYJedzhPIrIs67W9Hj/Lb3wXraFmJFt4FvdNf7b1u4NktDm2PQDFgjWUW5/3PPkpO/CwXtnJs5PqOhipzsa7325+HqOXgEsJ3jpG2dkWJD7rM0XcJ7xRSGluETe7chNOIyIUMIkm2fVsq4DsGJ5ks7wh4a9z+LCDjNrMhOxGKlberDKg3UsaKqvymB1YSJXcZ6JzqeSR8XQNQM3RLyrzokfzC36DFR39w3oW2eLHZSmwhEZiiCKnjDvTJ7haX+eJ/lyq5QGQT2jAT7DgWCfa4GAzNb5Wphup0r88/n5hL8SYc5c2+zHoq3NuxEgbCEeI8sof26pwNoboi+kD5knb1lror5O+7x0Q8y6TuA62D/O4xT7v7CCwx4Sj5pgcsq+NTM48x2t6CNp6hnZS1taCw+Lq23xb2rANl2gLFLPGQycTNiNpc/4v0RJFHgSmVBkZ4kaW6dAPlyMhJAuVBZ6jt0T1gWVq1nvnOE/Cu3kt144m7uWPu9C61hyTF14f4O6cBQp69+W8xA3FEZwOn4SXaS2ipAuY9bt4wrq/WZhXD9HM8fwQtQsTrpRGTHC/ZmDPYqc5c7liJiv9QyEgXmhf6IOtJn9ntH8B2BVuhjj+ju5bahNGhKtt1PvPRdmP+VBZxTo7mXMIOmMyubr0jKUKsiXZvuBJm/yC3Tsy/6NAkbXjJBAySSfxoMucXixrKnsgwcvhLQEwIosGl0sp2Xvq4gPp5luiZp5NPu3BrYLr4UPWKqru4OslL83EAGMl+uMZppItdXuteWEj/0i9e2+479EZ3AuS8Fawr9xkvhqhGtAh8i/mhztKBMkY4sV8p+wZ7eyP+PhRrFwdrpTWrQH3CTxtUcLpranjHEafKVRvizU+3+KxPDPAqdEd95o5G9Yp0jnplZlfa5Skm2BNNj1f/apCH8vTYvT4oCD5eSeCAoUuhTcZ1PWF4ua9guvnWbx33iRCzOypAGSVvlh6P0Mj/POcqmLqhdwf/a7znS5PiMmG0Nxq463FEb4yAXCGEqPfGj27wJy0kHhol14XzfAlWOzD1Q/2zC0xXl7EdZBsXvqP5VqMAGLjraA+iYhRAaMQ4ANhQUQerK5uhyyrkWZ132vD+77BpoHLZHMHIBmRiJ+9bmb5/yW72i09p4nzSMpI6e+ww0rUNPbVNbQeGF1ovBqVcXFE5Ptc9k/R4q/HZHU4eHKUKFr4NJm383UciZGz1dmdwkfDED61DGput6iDmdWF0k/T+STfkCzsc02e2OobAd0oqDm210AJHnHOpQeNp4//uwB0Mgnh7Xoigo7HgUBF66VTCWluMWF26fbEpOTEgeXg6Jx1sZXVp0e9vDLfoVztqttFNl1uBeOwNGPRTXVJJFJyapdbX/0Jvt2GufhEpU0lKKVKPny5OOJpNUUIX6/0REZScxi9bzUeeNzS5iS0VhfebH/5J+unEoFWJT30xbezbPbfe8WyqMGbA4hNBnFXSbyXozeHqiyFAeuX1Nve8Qo48JwtyrDtoSzedOPYijAA="
 },
 "c-alice": {
  "id": "c-alice",
  "n": "爱丽丝",
  "en": "",
  "hp": 6,
  "items": [
   "chain",
   "cuff"
  ],
  "passive": {
   "k": "lifesteal",
   "n": "逆流",
   "d": "对对手造成实弹伤害后回复 1 点理智（每局最多 1 次）。",
   "v": 1
  },
  "realm": "超维",
  "role": "伤害型",
  "line": "",
  "creator": true,
  "face": "data:image/webp;base64,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"
 },
 "a-15562": {
  "id": "a-15562",
  "n": "莉兹",
  "en": "Liz",
  "hp": 6,
  "items": [
   "cuff",
   "seal"
  ],
  "passive": {
   "k": "menace",
   "n": "静默区",
   "d": "你的实弹打中对手后，对手下一回合用不了道具。"
  },
  "realm": "超维",
  "role": "伤害型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRsIFAABXRUJQVlA4ILYFAACwFgCdASpAAEAAPnEsj0YkoqEhM/zNUJAOCWcAykOpfnN4E+HH5vqj1F+5N9mV8Zi4keODvp/LfYA/O/oi53HqX9n/gI/m39j61Holoif+td36QLjEzGFqSqLENTsu4d/T/6q6i1djnf7fPxLEG1mDLRVi2trbKYEGLA50KLSkPAxcJ/CCHgZE5mYuEl539YPkAfsfReojq+bQ2Kpshn+6rmBGZATS743594GdjKVL7FqZEysqLG8m8PerOTaAAP776slRJ67r9OdHg0wc7Eh+4AhKwNqhgJVIwEoEHg5uaNomY1DbOH699cbcbav2RFcgrjAvv3/06Pt+mCk9prkZ0vQsekHGvMbbefYcM5v7j3nKq1AAxSXYjP7PPNkxL8sdZRsBcY6NUgzH+iffyqtfauR4gL4wJg7eMH3PpmKy8K3vx7ji6LaZ7msy3snQswmrCqRYYPpAQC4J13d5QY4i9YY55Oc45q5KZe9Nf2KwPye5qf1qt2/P7L+jZQE0r46f6AWaWvqn0m3eaPYy/7jCmhx1Y541dW2U/DWEsMdw6EpthMpofiClKe0NVkTAOmlcYa4utX9Wg+oBlvunEBMtjj0BqgUaLCYQ7g4w+qf6bRacXSRaShJANxJAVCYPrdrRPib4J/M0+IPZSi3ChZA/9Gu6w8GhbVoYrWdRUnu7/V+DWSCy7w3VMVnEWcTWLF/qFZVOgEdMIZmtb5tFyGf8OsNZZwJq2cHa+nc/U1FWrdymkSaVhD1KtDVWn8GxM2OR2RaD2NSFh+hzvnhnVBowDBkxAoWOg221FwQe2xXHql4Ww01v7DHcszcpD9shfIBFnfaXfsa5/fC6Jl1JWjhDy68DxWY81+7lwBVGuRkvCalUpRJXhwlsI2tcB1Ovqa9dp9kNkqurJ8ekDicUDzOB7nsY+a2kJOUCl+ETxwTFa+ZiInIPqlFQPsv5oFbZ2cdRTp0Jy3b+H3V5id0gkt3xxbNm7OWehuZpl1FxMDWO6eSnJtM+Fanonf7miSWHpLUAwS6A6f721/hrqfydBcXrZRh9RIIwl0F5sw/J01AICIn3Uyl79RGTt4YTmFzkizmRFYAVtoZD/PhND4lUcLXmEEAJdUcxV6iTwLqE2AOszMuyqbaJey/Yv9KW5aSdoDIjLO7jT8X3CWRnIDTG/sQTRA95/STadGZN/ZvOPixQIvUXBIXxAGoUoG2kLGfzFVinI0RMaVUtaWhN81Qc1WxrwR1KfSvRH15hw/J+9bPjOSx1h44KZQmRWvvTm0l6QUTCX4uAEhW2NS3JVVbaHfSlh+xIjAIkcRmqSiSUjKnHEbXBITAxXd8nZg7/iBCihBEDgaSQXwE/y9mH9ws6ZEenNWORcpOMnOQ9Pl8zS6QDJTIsQBuIN4vQBJXikHQ6s7bmcbsKbUlMMLds8L+JA+geY03jRQTGN/70UkzLKR8ba3b925KBLJGCjzjaE5PVxz/3w1x8zS3TB5z6fBL79l+f+WgXzocnudC3iVan/HSrYcIUWlWQUIcBCmNR2SrHBdhCXiuJJV1yc6hvtJj486KyQlTDC2waUr8Mj2OQP1jM+JQ+75RS/Gc8drQqJYrELgx4BMtkmUn9JlpedmErqVfoYMCHa2S6KFBROQ34amYhf3HGg962+7YyA1bDvOmy/jYC3RCK/a3UPCm9r5f03F5SS6wdmdy4G+ORuQt4629fNkw2LwV0iTBerLACziSaQ3NSKbWiCeYnjxCpioOLbWYyYEiif6KNESeJzqyJG2fvMKNWOqE7TiJtgqwbwYb9tDXMIyD31m3s6/cN0PD5yvsgaqL5Tps92CExPPvH/pmlhs6B6DEnCook9O2ojwvh+NRR0miG29Zdf4OBofrJfbn9hrH1LBoHu+5LV5nUZ/6L7hK9u7l8kikp4uvgViiRtX5Gu30DlUNda7UqVRs8SLzC34RPkAAA"
 },
 "a-15593": {
  "id": "a-15593",
  "n": "詹金",
  "en": "Jenkin",
  "hp": 6,
  "items": [
   "saw",
   "cuff"
  ],
  "passive": {
   "k": "precog1",
   "n": "一秒之后",
   "d": "每局开局看清第一颗子弹。",
   "v": 1
  },
  "realm": "超维",
  "role": "伤害型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRhYGAABXRUJQVlA4IAoGAADwFwCdASpAAEAAPnEqkUYkoqGhNforMJAOCWUAxJRlPZVpjoD+g4MsRHsv/Y8LPACdh2gXeLvvtTK9S/3npx/svBT+z/7P2APzd58uc/6N9gj9cf+h65nre/br2g/2OWh4pNTvrJwsn4I1GN5f/aRlLjZd46FmPzqTwdzL9hdgAB1J2Ded/kUXRPA8fCHQs49Wbwuzhr5aDotufN/Ywq73240gICngJ0EYx2VmOLkWHC77xr5bXoKDILIEH53kz7GQJhEku9oThAD+/Hh/PXf+JKQv+Rj+j/GE/trFKjC0qGw+cUCPA8JJyrCVK/IjgWjvf4sxjrwJ7ZXTG2I98SlOX8pd7NQt3GX1oEin7zuziz+5kR9kXMufTp1TZ0VaUiHj8VLDCHb7+IcXhZygIqQHkh3NwwaBlhRS3Zp2e6MgYrfzfMf7cihKkZaiuvxzv4vzlM+3dz6iGPg2cQK+96TP+JHlF66sAE4tX8XNyN+oTaBR8C3RqQDkNGq9riym/L6jYbvPxO5F0K2nPJBCsiDn1j1EvRIggVIZMXdjpOwBBEnSLA+t/vbcDWdlyNStpt9EpZSM7rxeSKEoxxqrDfmaG0rv6JwpZIRrgvwUEoiJOFtDfy4GGdXy3NEJ4i6DfFKiOvIy9Bvoob7vYbRdneqpw28+P1bkgUDfkdIKhfzgA7zHC68zN09ScBIUQwdFaB9msnBKMZj2NFrL4duaBVXiUKPW0z6gN5sm6aVQKrw70ddzWlGQDsPjyt6d4XtZTTUrjGjDX1XGI+6xoDHaJEaUkh5xJh9HRxmWtNXoyQ0PISZmXimELXV6agVAwGwcR+FEtapN3OEv0kIGr+fBO66EiRBxgnxXQ1id1FpiE0mMDoARZtsoZ/RMFG9RU70S19vK32vbvgBeS7krMvKZY6xAOK2Yc0JyeSAn9uWKaaeEvryfGHpdvHzbbdpk9BCyeatydtE2UTOK6+DhZKtNFa+t6HStJkVyUYXOpQF2KyXPyT5xR4ttmRJCrVEs1v9/VzLws3wju6J6vgC/ozpri1Te9P7iubsNAXv+3fp9o1B65Rs60R99fSc2fFcXDMkf8iYEG82EL4c5swX89yryuF9M8GqvUcnkUmHxEpmHIqfOtFE13AVfYsxV0dX6dLZ+8HvC4LQ18cLfao1ptS6IK0KA/9NTr8eV9gVvQozX5treVr5GUfzQAmj3/EgK3PJDaTEw4LUVOuzsS5umdlywR2H4VYY/OWgyH5i+jDuOqKIgtOVwh63xuLmzxR+6qpVoR3+Nv05WArOdO44u6DQ8cF+h+Yhd/cdQIT4lHghsQZXioma58xHAgUrKEHqX+hjsjBW80ErounnCRME+1AZ5OYfgUHPypG6oQm25u/1JFZCDnkneM69IPBeUm/pIFv3Xwru5o6kOeq+Md+/3TNrtL+AuatyACqDNLnkktIca/2B2Z8rfwRBfATeWRvhx3h4Ry6GtPnYqEnd1mXZC2aqU/aT7jqL4upnQ5RhnxlJJG89yxXYHJQcywjFfO0EonLV+rYH4BFtVdk78izBTg//Yl3ZaiEL8Gk+8dUYfWRCYnzYDCpSDJQcA3yG6NkqBItoQUXHOkdl54+J5R0lBrH2ooofb2hxmLnfWQKskSXO787f01U31fleqp2EGrj+7mxLEpXzFYM0kxscuLj1c/NTUNSM5zGvXH5J5Mt2nNWj9AhAbAuIZH3CqEEd+UKYYD1JstI7LyRO9Zd0oaXMTD75S3evVDVBScIpyUsKB5mbodqtGQ5YOAOWgZEP+kx30q2afvxZRiDnq7Y8hdQJKT6HOba09wXqNGLYGPvrimTLLbjM3jMQ5guEXLNH2p9fFeNhnQRZ8E78qpAskyFG7bnj14n1bQbClSRr3vfCwFLPn0THJ8nu75CCL02LA5xa6PLGEmKj6NA933Q2+BPvlxEWwUsEl5xh6pZEzjewZsJS2D/bJJ+ecyhtY1Y0TzUXfJJwn3d03MbfJ98wYz92qxoKxYMrDiNVxm6kkVA9qhqvF22G+K8Ojci80zRWdeBRU1MLCfH731GArB4bNbAAA"
 },
 "a-15590": {
  "id": "a-15590",
  "n": "达芙黛尔",
  "en": "Daffodil",
  "hp": 7,
  "items": [
   "chain",
   "seal"
  ],
  "passive": {
   "k": "siphon",
   "n": "旁观者收益",
   "d": "对手自射打出实弹时，你回复 1 点理智（每局最多 1 次）。",
   "v": 1
  },
  "realm": "超维",
  "role": "伤害型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRvAEAABXRUJQVlA4IOQEAAAwFQCdASpAAEAAPnkwlEckoqIhLhkriJAPCWcAxgxpWVPTH5bvcsjW4f6+BxVwx3bzT+vWsmUAP0P6H+dJ6d9gro6/th7JP7VM8RjhjmXwJaNsvFqmeo49lfZszwqo5BdehiUK+GdH6AxxS+ykOllXsYVdOEzsip2QZZvSYVLxOmaxXDnQ0RhwVj4YBqK+Be4W6gDKNB/Flvk7db+zlocZd9IOmHnfmwfp3JoTprZud/cAAP7zsPB9t6RhcEYd8uHt8PNFAZfsqsvOu5rZV1pYESmWqNs5GPT0r26YHQpopbAXUN4ZxNI8aQxIBLLoZIat36/h7MwGXIBLHcpSiCChkoyDy2lsXoUL/EJD/8MkUWFLjPZ61+YST54p2n12yOf3Pg/+RTUJpXN/6fw/lT9q7yhffVT543UnPdIEsnkLxA774WUCK7J2wzWtolaYmhXjdrsC/aG/evV8nsG58vVxM/PtH+Yd0q9Y/vrGQoc24IeIyiHBPqlc6xAMCG+8rOubEE9LTfLJ4nYDI4M9c/0fkgqvuG7TjJKbnNO/G1jQ1JBj/RTKENCtLFtLgcx3/3s2bIfxHb5OfQ/4wnro6SJ/r0+r030tJU3Ktiog96cCx6fLLDBIUucqkRSbdN91LyYpjA346+61V6V6xs9yb1OrK90pi8NfO7VfbPwAmAXd5zPHeBj8H+1R+KEFLj/2xr9nbNr2/cTGaBeR26fMI0LrJiKF+1EduUOIFmDmAo5UQNB1fwmYqpzUEoRfSJ3ULWs15Q0gAx431HOhf5n8Os8rpnacxvDYPMQSzuJdqqlU+CQqwXhqh7Q/W+vo0RTxGZMPbqioz/2mDUGhXApuylc+zdzWEhxJvPH3qQLdeZ2zr+7WgPQ7jfq2i5T3Tm9LA6vuOOy7yLPxntS0PZpC3X1JhMRPku9IFKosnFjzDfXy4ylj7ZnCa9JsGCszsMXk//hsEvQ+WoqCV8xfnB5seCbbYu1h4sc673aWWtfdnCKffnnHWjZH2dFvyczaCkjxQJ7KTXndzvRmSS+42XV6DnIcjq7+GxLlu6JHmQG89h2ABDgDDyJwfnxoOmPdN+lAxKJh+q1R8A+C2i8iLAU/Z5CBAwzUJyURjcs/RWiImVf82L46EbG8km+UTiP8UmIzVvom+dhhORTfCDdZ1WPTnKCghF/+nB94OSdkI4SMEyMD9O1w6KAamcH8gsfSbOfWbnYAXscsFpU6Y0/o526iMoFicR+keLiFD96AWdWn9VCiuvzRFgCjwb5PUQwV5AE+mQSXCt8ojtVASpVhLO+r6XvbyVyjfpk94dGc9L5Am6/6yyK1EbvMCjW96T8i8nQMsR60/suqOqzK3BkP/OD+biyjfIsAUNf4VfO012xMj9wDp/gqL/aYt/nHJ/bcAZXWXSGIYgusVtbUNeS8T4NwNxiGhI8WreHYmGbVdXGpA2dnpw+ciZaV3UybvqxZ9Wwtu7PDz1EOw6rvaEnlbgznBzvydt21aEwGaKP7KGBZDMPTpEAI2wBHgNGb/W8drTE3SUCzXmXfmodNPla+3+rZFlrZk68zGRnhc5eRbj3aDupqteGt0xOFPU7Y6d+nprH/KPVdZfw6Po2MEOh7KuKhi37+KUpB/GXUGYVfPl2L69+IhCn8CwCmwB0GY67senHVe9VaAAAA"
 },
 "a-77923": {
  "id": "a-77923",
  "n": "卡斯托尔",
  "en": "Castor",
  "hp": 5,
  "items": [
   "pill",
   "cuff"
  ],
  "passive": {
   "k": "armor",
   "n": "白夜罩",
   "d": "每局开局自动获得 1 层护盾。",
   "v": 1
  },
  "realm": "超维",
  "role": "防御型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15586": {
  "id": "a-15586",
  "n": "旺达",
  "en": "Wanda",
  "hp": 6,
  "items": [
   "aegis",
   "seal"
  ],
  "passive": {
   "k": "grit",
   "n": "延迟结算",
   "d": "每局第一次被实弹打中时，那一下的伤害 -1（至少 0）。"
  },
  "realm": "超维",
  "role": "防御型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15579": {
  "id": "a-15579",
  "n": "温柯尔",
  "en": "Winkle",
  "hp": 5,
  "items": [
   "smoke",
   "cuff"
  ],
  "passive": {
   "k": "revive",
   "n": "存档点",
   "d": "整场一次：理智归零时回到 2 点，这一局接着打。"
  },
  "realm": "超维",
  "role": "防御型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRigFAABXRUJQVlA4IBwFAACwEwCdASpAAEAAPnksk0akoiGhMBn7AJAPCUATplxxFRuX4FThNLNQBPTobsvlhcFPrd0Nd+/HF6Luff6u9gj+YeeT7C/JJZ9JhFrv78Q58sLYRXwse+0GaAO39kaWpqESI1ClxXhaEdDwgN2zJLLPr60jiKwcXuJ0zQfL/ZkqlIIZ0thsNVJ9lYkGCqMm9BweDbhGfSJN8857tPvzrzLj0K15ZH7gAP7+UXG4DebLkDEuUF4Bn4wwB+dmi1bgJDjvg7vyIS5FoxoB65CFR5C5o9SNOsprs4ohiNgSSb1AX8++p2Ic1yHzNTPwHCqpXmTsIx778Z6tvxsav2RtZq7DH65vDrA+Yg9r1uK/k7Xy3q9sD+gl6h3OxtDmoTyP/wENdQT/Cd8LUAPjbxKjg5+8ckG8GVTZLMeec16BuOQiROvKKpndRQbl2C6z6J0Bh27GtbPXhOTrKEasDZmz3C/rBnI0f/8IFXmy54mEd4uzbMwlt3h57FPt+ws02FExRdcloBIpqJb8LZP2tRfOycd9nIhgIqY2R6n2CD8C7dI65C0qeIi50UMzTUqHfUXI3HK+IUhsDL7N7ZovCKF5XeQ5hopDd20YTG+9aie5pTO3wCW7wzj12OYcD61tIQNxRSgirwanJ1jU3FRNP+/lh3Z5R+2zcxPZHWF6KOipud1bmP9d2ieOLCl/a3ZPRnyB2Kixrm0awDfKHecEAwAW85xOKl9HhJjgte9YPjgmZKvS9VnRGsCQeX1Uk2Bg0G5R3lCaREgQLcVplLBJuZM2rz9RDlDHGxkT6G3hMC8/+5eDFhYQBN+rQgIWN/pAZpKKRglYFEJ0Op3wiU7YGk3Mc38gYYcDQIWhAl8+Pt5rVuSduPdmmx6dH4RWU7vsu5PFuOSr4IGXxTHZs3cC0V1NJmnVh25s04N9kCy1hqTSqAxuFFe+TQzXo4l61bTmjcKW17/aIfSoNEW5hzfFowRuMJitkQ7tn5ZYLnK4wotQpimTFBWAbImMNRyMisMf292HEkHWv99VoEQCqBeBRKsAjSkiMxLwYfN8BkGFrD5LUC9TbM7jXVnJLLErs7GghcRd/powCh6HV4nRfZxgHPpzI1zzpOfmylYB5rGpsmlydkJ6yCJFF5+RXHpD7xZmF0KS8y4t2bONSHsmDjmgumqWP+37MNDTMZJSgQdUAehtTmmL/gi/HAYU9/xYrTxZ0SHRZfaM0zfOCxYZUyXi/cjkCFvqrypZZX5g12k2+/47lafNRFWYgP8xlv9/vbu6kH6l/1TsCD4gpEON9Pqw/L+wK4R/xcQv8L3iJzySo9zykQ9wzfscijz6VJWxz7IDoY1JMyLc/QC2+X9o3+q00UKBA9XUG2OMpY083x489apeqLGDcl4TYkXilyzeUIaNL9HYN8p869+udYzaN7nlNIJbloGZ0geWciK6W2G7YVaPwEWhxBKRFL9V7vmgNldFXVwFxzGRlyO0Z6s7Jxp4b+uYjfMi7W0b7fHsyTQbE7g6ddzJb9ilFInXZuMef85wqpG45HN/aW7b0Ls6PWLJoKF90wnLQX77SnFlofcpqDMX4LjM0Vdc2Ligx9RcXTE28cHrp0piBJH2Nk81WVaeE5et2XX+OGFnp4yfZO/5LB6jFsVJdOusUy7lFDLxI9M7njWFS4JDLSFN6uxMsbVA375pcj5epddGIO6Ijui+RL2DMjqUEgIdlxf8UZe6jbqRjG77piKxY+Y+XnvXFu0AAAA="
 },
 "a-15603": {
  "id": "a-15603",
  "n": "艾瑞卡",
  "en": "Erica",
  "hp": 5,
  "items": [
   "pill",
   "seal"
  ],
  "passive": {
   "k": "lucky",
   "n": "概率坍缩",
   "d": "残念药剂对你必定成功（稳定回 2 点理智）。"
  },
  "realm": "超维",
  "role": "防御型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRngFAABXRUJQVlA4IGwFAADwFQCdASpAAEAAPnkwkkYkoqGhM/M9UJAPCWUAssRWDcl6PtDvT8kIGdo304jP7cswK6q9Uu92+u/5f2APzN/uvVOz2/UnsHfrp6Yvr2/cf2UP2Mc9HMy+ZzeevL5ufm2tFehaUwxRj9OQBR2P/dokv78moDUPFjljzINETS2Ykm30KgWgm5wD2n6UV/nigy3RXQE+n+s+/K4tsDFTx44r4i0pdIJK8WCziz20MXJdc49chIxIx+AEAP7+owQB1/TUHg4XKIHGWf7Nik/M2CbWENEdrO/wACRPW+YNo2y/i5wJfvcBfh0OhggzT0B/tiVCvZg0+aODywDR/Fe+bA/QFSxvjAq4ju/1SUZBa5rh+wc5pw/qwTMf8AlNXPV2ru3ltXpCCoSsNgAPNw+dT8d3fCVKltmDMRrqbC2iUxL2LItfl+mToNi1eq7C+l2b4RjMbpo6b2TYeuWklXl77X96H+ir8CJpLq6YtHFsHcp5+J7xWg5nhb/JR0eMNNe9oh3KtRmgekSB1YsZL0ZzmKYEN8EMrcExv3J8P/h+uFVPqaDwbHNuGKcToSOB/25ZA51kRmmg6zcq7RlhR3cJT7NrmLFWBRY3x31ojDui4T46OjxYHivFaMWhZ8/19LHrDs1e1CYsMsNer9zLD5+P0xNfXz8OX6GhMonUmElGSL6Wt4CZQw5lObz6xLnzD3CLWMBGnosvmCEiqZPOc08FgptirntCTObtWOy9qds7YxubQOBoM5RMlWN/6bD+ERPS9EU7qeiN3kq12+1AOSZdp9lIuBYoPX7lFLY19MjE/2gM+2Jl1r/P+om2ut+iDEKhryywtR0I5+uxCXa2lIL4bTZF0g9X+J7zST+Mh1kTin25Mk+8fnPidbH+pyab4UvvfU8shHkU6LQ1OSQ90V7mQQKlxmKr4lrsrUomtDhQRPUzJ84lni8tU+mUMBdlKiI91/9pKgo36cDQ6MBKLIUSjknqkvOwjJ/Uo8SkjEM+CtGpdpAG040QOrXLXkdXj86VLXaVLvjBlLlU37CKZZzcfcvNz0X87YMPy6GQJGo2ezxD7/i2hxVzHNruX8T0RPjan8L1eXfNNHZGycfACmVbv8Wc/MaKoWHZxIaH/SmHH/gJSAc4w8VsYz2eljY3bkyd4gJevKG6WISao774iQVAOyXzL0ItGpQ/6EQ4cGzuXzhF+PPxPyH1ny523ahv3zIOk06MfNWAf2MDHSE/YF5KlCvq4ahVMR/FLNOGUrDNLLKgwZEDBkakasM7Um3NjOEmkXa9tng3s5uMIXvlAIBMfhSGdrSx8tBFpTAGdCJxyj8rQO+tZWN7EEJ5gOSvHy9hWTnxu0F3gZkWYrFSn5AfI9kRR/JKxAc6muLlRVmB9oxKb8JDWPMR3ZeOxQfREY/x1w1T3eyBkuYXcfbqyPCnanB94S/m1+dW79dx/omjk8XLg9jvXz1kVXweJNLoktyUEu98bBot/PwVR8d5qeirtGq6mWLpJybabKXI+1w32cyxfVsc8Fy+wpNp3ctxTxEnmeHxSZzqydhb5xFeNeyEEvQRgmfL9/vwcWaf5wreTEXz7KKhrdVgPbVb0bvsBc67rMZGNE9skmRHoY7RUlRgA/de8gCMq11ess6iSeJDU8jaF7++NISg2cxhIv1UEy/lFFqz0syK7tooRMjfGm9i/hDAeA/1vGUel2kq1Z5bNTrgwRrG5bRmK16z7oxqEFMZXMRZL7hsqyqfIzS8D4AsQfRVsXmCWe2vz99ok3nbAzIvTDQ302/f+iNo2vMFM96glKqN8R+KeirKVEbpK7RCat5xch9SwapwelfseEdQMh9HzVBoQvQ6w4hXkHCQAA=="
 },
 "a-77925": {
  "id": "a-77925",
  "n": "克莱门汀",
  "en": "Clementine",
  "hp": 5,
  "items": [
   "scroll",
   "seal"
  ],
  "passive": {
   "k": "armor",
   "n": "白夜罩",
   "d": "每局开局自动获得 1 层护盾。",
   "v": 1
  },
  "realm": "超维",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15572": {
  "id": "a-15572",
  "n": "卡茜亚",
  "en": "Casiah",
  "hp": 5,
  "items": [
   "needle",
   "cuff"
  ],
  "passive": {
   "k": "menace",
   "n": "静默区",
   "d": "你的实弹打中对手后，对手下一回合用不了道具。"
  },
  "realm": "超维",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 },
 "a-15583": {
  "id": "a-15583",
  "n": "奥尔拉",
  "en": "Horla",
  "hp": 6,
  "items": [
   "lens",
   "seal"
  ],
  "passive": {
   "k": "precog2",
   "n": "时序回放",
   "d": "每局开局自动看清前 3 颗子弹。",
   "v": 3
  },
  "realm": "超维",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRkoFAABXRUJQVlA4ID4FAACQFQCdASpAAEAAPnkylEekoqIhLBgMAJAPCWUAvnveCw61/H8EPaR9asZ3KUc3a2dU3vprUFAD8zeh5nIemfYK/mv9j/6frpewj9wvZx/W5n6LqvqLkEOLOVpnsTqQfNeM+BG1UlugWuojID0H19lSUvXJjg9os4Ii7h6Ho5m+bjWJzzHlSfcu2/6NS7AnOUypafpkr8fwMA2JpLjlBHEOmEDLIK612oqji8VfhWJ6jzqsm+IAAP792VjCetMsALhAU2WFyFv4pTW7XfELE9MgXwbmvf/hFqZG36OfYK1vfuw84//qZR8c00fpgcU+379DtsLH3I8DOtskKYNUEoLBUHFD3vT8OMBeOMdOqb9EYzodrAfH2lDPWPmGK+rzGvYEDpIZBW2e9HWjkzgN1bJQ2XXHQ0BYbR4S/Bxu1Osf270s0e9wXnEY2c32i/AkIFs/nYV2majbzROYH04eAesAWz3RQPny2Vsrdya7dSMaRBuFG2WKbhyN3xb2+YK2AgQQOmqga4fvCpnzlpekVuemdSvzrT+4OXq9YQk6dEcSRAK0J/G4Jsb9Fih4Go0Pg6xtfv65+jxCBoHVD/tnbdcmW+mo6lX8ilNsfOBx9GioQ8miQaLZNqpYFlF3cQ7XQfsbPS6jhT8R4cZ3GwrIEuukNMeoMUQUR+/dWACZMIx8bC2mfRJ+Ge3SmKFSOU+ul5W4+qW2k2eXf+RpW4qCqxbkd6fqEbUiQZJKQYy5dHrwdc7aG7BPvvflRmZu+j4twD/m3perYHFGjnu11m24mmjB7AsE56TNwetf0hfN7obtvOaJ6CqE79RU2sPAGmoDj0Q+F5MAQf726lixZxTsxWMBOA3dTN1fpJn0bWzJSjg53LLchpW5iPQmZTSIO0vf4eW/T15zDjH51Vq6HXZCol3v1a8OIW9fcUzDwRuhc2Xk0Tb/PGK1prFJNhQ6H9SzgNGkqD4PaXxa3qzHDkz5YrSUJSu9/CZ1YRyCFOCms/xEW4MkGMAJZ5mN7B0ohoWyH0AbI5xv2pfrgu3+28QmdbnsfyyhtTYUO37SPeFbIT6EMPni3sqXRBuq89PBgd48ybz0t2XtoHIHJnnb85IVj8CrV8xVXMIQawQKMBRayCEZib0qeQqGnm+KSbgh+eEs9716YRSiyFuh2pZEhfFp/kpNCBYFDQP/E3oyeP/sbrow+DVG+RZoSjYaTTYUBHfmRtRnUvB96ykq0N1pqa7P10qhH1lnSpdKYzyt8v6urmuqNXBKQ15EC51kLV7R/VzTjJHMvU5ArGsYtWSxdGB3G9l+rciNzZIVfECxuNVnk1hqMvpAxdctTRNM8JzpaRF9MrtHTIsEnbQoMZLw/MR3q/Qq1ww69aD2Y3keniS7eybOdvGXCbH3gCm52DdMudgZfIOLh8hU+k2CV0X9GGDZJCQH/sDaTcXmc8LhHABqQ/uJe//HLkRjMqABSGvmHxdHTemNd3S0tO4akFqjV2MzSN7rhkI7/+tbY3uf5IsFgdwKKDuhG62Ny9adzxYchbk73qqEYTaDesiWEDb/i4WIsol8p93a+exA5hlGkxRbdUZZNnjxDTylCpc5cgvLguikX8/4t3XcE5EqWgOw0bB8njFWO3LL3DNHG3plZWde91qarhKUCwIKP7qXam9PgTKQFp9AzIUd/WPhGyKxHrZhxcRKVdcMBcUqBVPHk+mmL+kCEGGOt83BGpsmvzdxfPRWcnmGwqd3XRsXwtbOSUe5WeZB4NF82VVVEtaJ0wrHeiOeI7UpQX7W11sFL4FRkAAA"
 },
 "a-15574": {
  "id": "a-15574",
  "n": "汀克特",
  "en": "Tinct",
  "hp": 5,
  "items": [
   "scroll",
   "cuff"
  ],
  "passive": {
   "k": "echo",
   "n": "缓存残响",
   "d": "你对自己打出空壳时，从桌上再摸 1 件道具（每局最多 2 次）。",
   "v": 2
  },
  "realm": "超维",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,UklGRvwGAABXRUJQVlA4IPAGAAAwGwCdASpAAEAAPmUgjEYkIaEhO/7QgAyJZQDElDW9Rd232PwJ8Nfq/3B9W3DHaH9YP03lv/qvAH4e6gX4z/OP8ZvLNg/QC9ffpn++4wPrV5o/pb3sNAD+Sf23/veo9/2eUT6S/8f+c+AX+b/1z/r/372tfX3+2/so/s6W7G/ZRLsdqAokx6A3T/YGbOGJgaah9B3c4Yy8KeS733bpVWrJZtqu2daWDyqaNiP2LbEimYGp7Ff6yF5yT0E4AkJSEuoRh8q3GoKHZreRl1UTsJbBIH+lgAQ2gNYEstbIp1eD8OWAAP708Su7gPsvLbTDN7rTYqnlFMO0i5ATwiQEKFUmbur75zF/hbWIfmjAn8m6S7mI+ZK97AMZpPxIaSrkDCquyUTMA0tmrHE5DaoNxiBHpFasIASf4MmrB4+n4Pz+RguIWm4GXuTPiBTqQPUH/UwExC+oCGL8FpTE4ZSLQNQAgdYv9/L/iKYB+G0JXe4d84GCPZu2W/umN4X6HIjAQXdsNL7Q6N5nYV+sm5hnhj2yki2Dqipyzb1+WpewKVlK/iNo6pHYBw9swia9pH6hkasbAI9SsTKmd9gR7ukjXUx6EXDlQj7N9+FbNskZkOrkjEZrgMVRw53gExJTX7xsUJeXlldslUL1K0jkArqDI9SGszukXq5fehAes/UXw3IC9QFU/S9XunvMn+4HSe954qZXi2ovdrO9ArIwFyK/IW+D0aSCkjbHkPK3WXv+JTV2DFv8B3uamEWVkd3KJzftogqMn8om/ZaEsrCWG0kLi30jdpaOl/R7jNZFHjKZSPsvBoM5Ur8Mmlr1qrK8C2GQWH3Fn3+N/PEk93FoYmfT/jfTyhDq1QtdXPfiHI61sDVmBqijZunTKAlL9SuXF5W+e/0ACHTfYx0S+tevoREb4kdA1C3tyQ3iy/YrU+iiF8X5HVonfjv46CO3XO+F212jZAc6RvYdhvntSb6Bx5EirwSuV6tgeKD2U8MmxTVrYQZg06h2putHz6iRARU6FLDRti0IKeWPi1q8bOK0/c+0TP3Ll1Pod8bumZUSK5G/lQNsvgURW6BgQV4g+aXYjGBS70pAfMuUdh5FMkVvKfYXIMB/ClgUYlhpNN8B5x5GHXEpAOoYY+d2nqxMNQTq2YOLChcBV/tU1BgZcYVKHzX7juSPTdmM8bBev35BUispgBPnn+WQiQIYZR87x2sVz20paOjT9cmz903ZAa6O96dtUjlO+iLhk6T2Xe+mcCGMmD580lh1/8YD3MNPdSdP8f1KjL8sgoxThUuATFFS52jpBXCPmv/UcrGTNFngw5Z04rSxwRU29onm7VnawVtW5sKOMpXYa3Duu37i7EFFXrr6f2NUwJGcqqVlMB0KVjC8YUX8JoX+g4fxv6FnICXekSMk1zDDUFmUOzbYOc2Gu9411a1Km/9iVpKlvnEJoUl/jdIHtNaih3gA+3Lnh8xWYnDNexC+lUN9DMonfybvgYqDyHTkQLwtCwDTmbA1dO9cKd165oE8SxUOjoANn9Z8Le4UDPv+JLbjrYGTV+DsqKDEKd5J/jgmxCiFVYxZmywpkE8+aqi90nhIdsIVQc/DS+bhRCc6gBXHbzJ59x15f6Op7ooGxucx6/E350i2Ylxt2R7/nLlUxoSWOZ6Yijt4g1YJf3ztFc2fu+11zZJl0nlIZbnL96bP9TbJli5MUaf79mNuqKH9bJGxi27MNyOyco9EnBWf9SnNgFcm7eXRga3XeMWBw5uh/4P0qNEMta+T6HEmWb3VWC/Ok9rvQuAd/w35btwg2vbqNK9yFlMCCxAfzX04jRaVrJBHl1xtdVIqUpxfAE6kwEV+SDh96wHu8nZmiNw6QWPk7UkKJWcn9VT2jNqBobZzyb4lZNBaZZFQfM70ftiF2oVNidwBfohZ3+TryKoYeO3P2Xhn0qCkV1bAHSBlc0kSgSDV1BTKpWJUy0MmvoxuuWnkDz/ygxHXSBNr/rXzVNv7g/KN954O7G/8Rl0dIzC02yeG3GzElUKtQSM6sJRsIKxh5hqiVnJe3lSbg3BKotEoqs5CxFDQ/jH//HNgGUWgopAjlZq9ScvQEIJi0FlpTSTmEljt1LgCNwbTRvXwnep9t2s3THokVqa+FMOjL2Q63dHbRnwhvaGeAMNeHpz5bMJTv8qnEW+tvvZOiKwluAhO6bWJdnxCdj5kvYSe8eEKwRKsxoKywk2xFDi9NmPNrltLPgeyQtcA7nCkAcXCVTvEnl0z22zwn1L7CVzPxTRj8s4+mNu2ZBuKJNRBrIvLYfTXKlmcvhCVsr7/AYhjKCHR2ULC7dDA1SZZwAEfycAobspiRGFEyXKJCtHtXBH+c+smkqDWtrzFXomRAAA="
 },
 "c-baiyun": {
  "id": "c-baiyun",
  "n": "白云出岫",
  "en": "",
  "hp": 5,
  "items": [
   "needle",
   "seal"
  ],
  "passive": {
   "k": "extra",
   "n": "多线程",
   "d": "每局多拿 1 件道具。"
  },
  "realm": "超维",
  "role": "辅助型",
  "line": "",
  "creator": true,
  "face": "data:image/webp;base64,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"
 },
 "a-77918": {
  "id": "a-77918",
  "n": "阿拉克涅",
  "en": "Arachne",
  "hp": 6,
  "items": [
   "lens",
   "cuff"
  ],
  "passive": {
   "k": "precog1",
   "n": "一秒之后",
   "d": "每局开局看清第一颗子弹。",
   "v": 1
  },
  "realm": "超维",
  "role": "辅助型",
  "line": "",
  "creator": false,
  "face": "data:image/webp;base64,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"
 }
};
const POWER = {"c-chaoxing":0,"a-15595":0.01,"a-77921":0.03,"a-130226":0.04,"c-baiyun":0.06,"a-77925":0.07,"a-15604":0.08,"a-77923":0.1,"a-141302":0.11,"a-125346":0.13,"a-15584":0.14,"a-15560":0.15,"a-130901":0.17,"c-ratking":0.18,"a-15563":0.19,"c-banxing":0.21,"a-15562":0.22,"a-15576":0.24,"a-15571":0.25,"a-15570":0.26,"c-zerok":0.28,"c-dragond":0.29,"a-77918":0.31,"a-15601":0.32,"a-54117":0.33,"c-xiamolin":0.35,"a-151844":0.36,"a-77926":0.38,"a-15580":0.39,"a-15589":0.4,"a-15567":0.42,"a-15597":0.43,"a-15587":0.44,"a-95786":0.46,"a-15585":0.47,"a-15579":0.49,"a-15602":0.5,"a-15592":0.51,"a-15583":0.53,"a-15565":0.54,"a-148578":0.56,"a-15568":0.57,"a-15596":0.58,"a-15572":0.6,"a-15591":0.61,"c-maodie":0.63,"a-15574":0.64,"a-15582":0.65,"a-54116":0.67,"a-15586":0.68,"c-mengyi":0.69,"a-15588":0.71,"a-15581":0.72,"a-15577":0.74,"a-77913":0.75,"a-15575":0.76,"a-15573":0.78,"a-15598":0.79,"a-15593":0.81,"a-15566":0.82,"a-145363":0.83,"a-15594":0.85,"a-77922":0.86,"a-15569":0.88,"a-15590":0.89,"c-samo":0.9,"a-15600":0.92,"a-15599":0.93,"a-15564":0.94,"c-alice":0.96,"a-15603":0.97,"a-94450":0.99,"a-77917":1};
const CREATORS = ["c-dragond","c-samo","c-ratking","c-maodie","c-zerok","c-banxing","c-xiamolin","c-mengyi","c-chaoxing","c-alice","c-baiyun"];
return { CHAR_ORDER, CHARS, POWER, CREATORS };
})();

// ---- js/roulette/items.js
const m_items = await (async () => {

// 弥萨格轮盘的道具表。
//
// k＝引擎里的效果名（js/roulette/engine.js 的 useItem 认这个），v＝数值参数，
// c＝配色分类（info 信息 / heal 回复 / atk 伤害 / ctrl 控制 / util 其它），
// g＝格子里的单字图标——没有图标素材，一个字比 emoji 稳（各家系统字体长得都不一样）。
//
// 专属道具（絮语碎片 / 演算手稿 / 自律护罩 / 血链 / 寂灭王印 / 缝合针 / 回环沙漏 /
// 赌徒筹码 / 预见）只出现在对应唤醒体的固定道具里，不进随机池——不然人人都有就没了区别。
const ITEMS = {
  // ------------------------------------------------------------ 通用
  lens: { n: '窥镜', g: '窥', k: 'peek', v: 1, c: 'info', d: '看清枪膛里现在这颗是实弹还是空壳。' },
  smoke: { n: '静默卷烟', g: '烟', k: 'heal', v: 1, c: 'heal', d: '点上一根，回 1 点理智。' },
  pour: { n: '倾杯圣血', g: '倾', k: 'eject', c: 'info', d: '把现在这颗退膛，不击发（不进枪管、不算开枪）。' },
  saw: { n: '断链锯', g: '锯', k: 'saw', c: 'atk', d: '锯短枪管：下一次击发 +1 伤害。一次击发就用掉，空枪也算。' },
  cuff: { n: '缚誓镣铐', g: '铐', k: 'cuff', c: 'ctrl', d: '铐住对手，让他下一次行动整个跳过。对手已被铐住时不能再用。' },
  pill: { n: '残念药剂', g: '药', k: 'pill', c: 'heal', d: '五成回 2 点理智，五成扣 1 点。墨菲喝它必定成功。' },
  invert: { n: '逆变器', g: '逆', k: 'invert', c: 'info', d: '把现在这颗子弹的性质反过来：实弹变空壳，空壳变实弹。' },
  glove: { n: '窃取手套', g: '窃', k: 'steal', c: 'ctrl', d: '从对手身上随机拿走一件道具（对手没道具时用不出去）。' },

  // ------------------------------------------------------------ 专属
  whisper: { n: '絮语碎片', g: '絮', k: 'draw', v: 1, c: 'util', d: '「她们」递给你一件东西：再摸 1 件道具。' },
  scroll: { n: '演算手稿', g: '稿', k: 'peek', v: 2, c: 'info', d: '看清接下来两颗子弹的顺序。' },
  aegis: { n: '自律护罩', g: '罩', k: 'shield', v: 2, c: 'heal', d: '展开两层护盾，先替你吃掉 2 点伤害。' },
  chain: { n: '血链', g: '链', k: 'blood', c: 'atk', d: '这一枪若命中对手，伤害 +1；代价是当场扣自己 1 点理智（剩 1 点时扣不动，也就不加）。' },
  seal: { n: '寂灭王印', g: '印', k: 'reload', c: 'util', d: '清空枪膛、重新装填：子弹总数不变，顺序重洗，谁都得重新猜。' },
  needle: { n: '缝合针', g: '针', k: 'stitch', c: 'heal', d: '回 1 点理智，并从桌上再摸 1 件道具。' },
  hourglass: { n: '回环沙漏', g: '漏', k: 'loop', c: 'util', d: '翻过来一次，昨日的手伸回口袋：摸 2 件道具，回合不交出去。' },
  coin: { n: '赌徒筹码', g: '筹', k: 'gamble', c: 'util', d: '抛出去：五成摸 2 件道具，五成把自己手上的道具全丢光。' },
  oracle: { n: '预见', g: '预', k: 'peek', v: 4, c: 'info', d: '看清这一膛前四颗子弹的顺序。' },
};

// 随机摸牌池。重复项＝权重：窥镜和卷烟最常见，镣铐、逆变器、手套最金贵。
const POOL = [
  'lens', 'lens', 'smoke', 'smoke', 'pour', 'saw', 'saw',
  'cuff', 'pill', 'pill', 'invert', 'glove',
];

// 规则页与图鉴按这个顺序排，通用在前、专属在后。
const ITEM_ORDER = [
  'lens', 'smoke', 'pour', 'saw', 'cuff', 'pill', 'invert', 'glove',
  'whisper', 'scroll', 'aegis', 'chain', 'seal', 'needle', 'hourglass', 'coin', 'oracle',
];
return { ITEMS, POOL, ITEM_ORDER };
})();

// ---- js/roulette/engine.js
const m_engine = await (async () => {
const { CHARS } = m_gen;
const { ITEMS, POOL } = m_items;
// 弥萨格轮盘 · 规则引擎
//
// 恶魔轮盘（Buckshot Roulette）那一套：枪膛里混着实弹与空壳，双方轮流扣扳机，
// 对着自己开是空壳就保住回合，对着对手开完就交回合。道具在自家回合里随时用，不消耗行动。
//
// 这一层是纯函数式的「确定性状态机」：所有随机都从 s.r 这一个种子推进，
// 同样的动作按同样的顺序喂进来，两台机器的 s 就一模一样——好友房就是靠这条做同步的
// （房主发种子，双方重放同一串动作，谁也不传整份状态）。
//
// 另外两条硬规矩（构建产物里也是）：
//   · 不碰 DOM、不读 localStorage、不调 Math.random —— 换种子必须能完全复现；
//   · 动作一律走 shoot() / useItem()，别在外面直接改 s，不然同步立刻对不上。



// 每局：几实几空、双方各摸几件。越往后子弹越多，也就越赌。
// 三局两胜打前三局（3/3 → 4/4 → 5/5），五局三胜中间插两局 3/3、4/4 的「加赛」，
// 让一场长盘不是简单地「多打两局」——先手轮得更匀，道具也攒得更厚。
const BO3 = [
  { live: 3, blank: 3, items: 2 },
  { live: 4, blank: 4, items: 3 },
  { live: 5, blank: 5, items: 4 },
];
const BO5 = [
  { live: 3, blank: 3, items: 2 },
  { live: 3, blank: 3, items: 2 },
  { live: 4, blank: 4, items: 3 },
  { live: 4, blank: 4, items: 3 },
  { live: 5, blank: 5, items: 4 },
];
// 赛制：s.best=3 是三局两胜，5 是五局三胜。默认三局两胜（和旧存档、旧房间对得上）。
const BEST_OF = [3, 5];
function roundsFor(best) { return (Number(best) === 5 ? BO5 : BO3).slice(); }
const ROUNDS = BO3;
// 道具槽上限。带满 5 件之后摸到的东西直接留在桌上（不进包）。
const SLOT_MAX = 5;
// 三局两胜（默认赛制的胜场数）
const WIN_NEED = 2;
const needFor = (best) => Math.floor((Number(best) === 5 ? 5 : 3) / 2) + 1;

// ---------------------------------------------------------------- 种子随机
// mulberry32：一个 32 位整数就能复现整局，够用且比 LCG 均匀。
function rand(s) {
  s.r = (s.r + 0x6d2b79f5) | 0;
  let t = Math.imul(s.r ^ (s.r >>> 15), 1 | s.r);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shuffle(s, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

// ---------------------------------------------------------------- 小工具
const nameOf = (s, side) => (CHARS[s.chars[side]] || { n: '？' }).n;
const charOf = (s, side) => CHARS[s.chars[side]];
const foe = (side) => 1 - side;
const liveLeft = (s) => s.shells.reduce((n, x) => n + (x ? 1 : 0), 0);
const blankLeft = (s) => s.shells.length - liveLeft(s);
const canAct = (s, side) => s.phase === 'play' && s.turn === side;

function say(s, txt, cls) {
  s.log.push({ txt, cls: cls || '' });
  if (s.log.length > 40) s.log.shift();
}

// ---------------------------------------------------------------- 开局
function create(seed, chars, opt) {
  const best = Number(opt && opt.best) === 5 ? 5 : 3;
  const s = {
    r: (seed >>> 0) || 1,
    chars: [chars[0], chars[1]],
    best, need: needFor(best), rounds: roundsFor(best),
    hp: [0, 0], max: [0, 0], shield: [0, 0],
    round: 0, wins: [0, 0], turn: 0,
    shells: [], know: [[], []],
    items: [[], []], uid: 1,
    saw: [0, 0], blood: [0, 0], cuff: [0, 0], mute: [0, 0],
    used: [{}, {}],        // 每局计数：echo 2 次、lifesteal 2 次
    rev: [false, false],   // 整场一次的「回环」是否已经用掉
    phase: 'play', winner: null,
    log: [],
  };
  startRound(s, 1);
  return s;
}

function startRound(s, n) {
  s.round = n;
  const cfg = s.rounds[n - 1];
  s.hp = s.chars.map((id) => CHARS[id].hp);
  s.max = s.hp.slice();
  s.shield = [0, 0];
  s.saw = [0, 0];
  s.blood = [0, 0];
  s.cuff = [0, 0];
  s.mute = [0, 0];
  s.items = [[], []];
  s.used = [{}, {}];
  s.roundOver = null;
  // 先手逐局轮换（第一局 0、第二局 1、第三局 0……）：奇数局不会有人连着先手两次。
  s.turn = (n - 1) % 2;

  for (const side of [0, 1]) {
    const ch = CHARS[s.chars[side]];
    const other = CHARS[s.chars[foe(side)]];
    let cnt = cfg.items;
    if (ch.passive.k === 'extra') cnt += 1;      // 朵尔：自己多拿一件
    if (other.passive.k === 'greed') cnt -= 1;   // 杜勒赛因：对手少拿一件
    cnt = Math.max(1, cnt);
    // 固定道具（专属 + 随身）先发，再摸通用池
    for (const id of ch.items) {
      if (s.items[side].length >= SLOT_MAX) break;
      s.items[side].push({ uid: s.uid++, id });
    }
    for (let i = 0; i < cnt; i++) drawItem(s, side);
  }

  // 开局被动：护盾
  for (const side of [0, 1]) {
    const pc = CHARS[s.chars[side]].passive;
    if (pc.k === 'armor') {
      const n = pc.v || 1;
      s.shield[side] += n;
      say(s, `${nameOf(s, side)} 的自律装甲展开：+${n} 护盾。`, 'good');
    }
  }

  reload(s);
  say(s, `第 ${n} 局：枪膛里 ${cfg.live} 发实弹、${cfg.blank} 发空壳。`, 'hd');

  // 开局被动：预知（放在装填之后，才知道是哪几颗）
  for (const side of [0, 1]) {
    const k = CHARS[s.chars[side]].passive.k;
    const pn = CHARS[s.chars[side]].passive.n || '预感';
    if (k === 'precog1' || k === 'aim') {
      reveal(s, side, 1);
      say(s, `${nameOf(s, side)} 的「${pn}」：看清了第一颗——${s.know[side][0] ? '实弹' : '空壳'}。`, 'good');
    } else if (k === 'precog2') {
      const n = CHARS[s.chars[side]].passive.v || 2;
      reveal(s, side, n);
      const seen = s.know[side].slice(0, n).map((x) => (x ? '实弹' : '空壳')).join('、');
      say(s, `${nameOf(s, side)} 的「${pn}」：前 ${n} 颗是${seen}。`, 'good');
    }
  }
  if (s.rev[0] || s.rev[1]) say(s, '（「回环」这一场已经用掉了，不会再有第二次。）', 'dim');
}

function reload(s) {
  const cfg = s.rounds[s.round - 1];
  const arr = [];
  for (let i = 0; i < cfg.live; i++) arr.push(true);
  for (let i = 0; i < cfg.blank; i++) arr.push(false);
  shuffle(s, arr);
  s.shells = arr;
  s.know = [arr.map(() => null), arr.map(() => null)];
}

function drawItem(s, side) {
  if (s.items[side].length >= SLOT_MAX) return null;
  const id = POOL[Math.floor(rand(s) * POOL.length)];
  const it = { uid: s.uid++, id };
  s.items[side].push(it);
  return it;
}

// 记录某侧看清了前 n 颗（n 超出剩余颗数就都看清）
function reveal(s, side, n) {
  const lim = Math.min(n, s.shells.length);
  for (let i = 0; i < lim; i++) s.know[side][i] = s.shells[i];
  return s.know[side].slice(0, lim);
}

function hurt(s, side, dmg) {
  const cut = Math.min(s.shield[side], dmg);
  s.shield[side] -= cut;
  const real = Math.max(0, dmg - cut);
  s.hp[side] = Math.max(0, s.hp[side] - real);
  return { real, cut };
}

// 交回合：被铐住的人自动跳过（一次镣铐抵一次行动）
function give(s, who, ev) {
  let next = who;
  for (let i = 0; i < 2; i++) {
    if ((s.cuff[next] || 0) > 0) {
      s.cuff[next] -= 1;
      ev.push({ t: 'cuffed', side: next });
      say(s, `${nameOf(s, next)} 被镣铐拖着，这一回合跳过。`, 'warn');
      next = foe(next);
    } else break;
  }
  s.turn = next;
}

// ---------------------------------------------------------------- 开枪
function shoot(s, side, target) {
  if (s.phase !== 'play') return { ok: false, err: '这一局已经结束了' };
  if (s.turn !== side) return { ok: false, err: '还没轮到你' };
  if (target !== 'self' && target !== 'foe') return { ok: false, err: '目标不对' };
  if (!s.shells.length) reload(s);

  s.mute[side] = 0; // 这一枪把「这一回合」用掉了，压制到此为止
  const live = s.shells.shift();
  // 「算准了再打」：开枪前这一颗是不是自己亲手看清的（阿格里帕的演算就吃这一条）
  const knewLive = s.know[side][0] === true;
  s.know[0].shift();
  s.know[1].shift();
  const victim = target === 'self' ? side : foe(side);
  const ev = [{ t: 'shot', side, target, live }];
  const sawed = s.saw[side] || 0;
  const chained = !!s.blood[side];
  s.saw[side] = 0;
  s.blood[side] = 0;

  if (live) {
    const pc = CHARS[s.chars[side]].passive;
    // 阿格里帕「算准了再打」：每局最多 v 次，只认自己亲手看清的那一颗
    let aim = 0;
    if (pc.k === 'aim' && knewLive && (s.used[side].aim || 0) < (pc.v || 1)) {
      aim = 1;
      s.used[side].aim = (s.used[side].aim || 0) + 1;
    }
    let dmg = 1 + sawed + (chained ? 1 : 0) + aim;
    // 「韧性」：每局第一次被实弹打中，那一下少掉 1 点（至少 0）
    const vpc = CHARS[s.chars[victim]].passive;
    let grit = 0;
    if (vpc.k === 'grit' && !s.used[victim].grit) {
      s.used[victim].grit = 1;
      grit = 1;
      dmg = Math.max(0, dmg - 1);
    }
    const { real, cut } = hurt(s, victim, dmg);
    ev.push({ t: 'damage', side: victim, dmg: real, cut, hp: s.hp[victim], shield: s.shield[victim], grit: grit || 0 });
    say(s, target === 'self'
      ? `${nameOf(s, side)} 对着自己扣下扳机——实弹。${grit ? '被「' + vpc.n + '」卸掉 1 点，' : ''}${cut ? `护盾挡住 ${cut} 点，` : ''}理智 -${real}。`
      : `${nameOf(s, side)} 朝 ${nameOf(s, victim)} 开枪——实弹${aim ? '（算准了，+1）' : ''}。${grit ? '被「' + vpc.n + '」卸掉 1 点，' : ''}${cut ? `护盾挡住 ${cut} 点，` : ''}理智 -${real}。`,
    target === 'self' ? 'warn' : 'bad');

    // 「噤声」：打中对手之后，他下一回合抬不起手（用不了道具）
    if (victim !== side && real > 0 && pc.k === 'menace') {
      s.mute[victim] = 1;
      ev.push({ t: 'mute', side: victim });
      say(s, `${nameOf(s, side)} 的「${pc.n}」压住了 ${nameOf(s, victim)}：下一回合用不了道具。`, 'warn');
    }
    // 「幸灾乐祸」：对手自射吃实弹，你在旁边回 1 点
    if (target === 'self' && real > 0) {
      const opc = CHARS[s.chars[foe(side)]].passive;
      const other = foe(side);
      if (opc.k === 'siphon' && (s.used[other].siphon || 0) < (opc.v || 1)
        && s.hp[other] > 0 && s.hp[other] < s.max[other]) {
        s.used[other].siphon = (s.used[other].siphon || 0) + 1;
        s.hp[other] += 1;
        ev.push({ t: 'heal', side: other, n: 1 });
        say(s, `${nameOf(s, other)} 的「${opc.n}」：看着你流血，自己缓了 1 点。`, 'good');
      }
    }

    // 血链·希洛：打中对手回血
    const lifesteal = CHARS[s.chars[side]].passive;
    if (victim !== side && lifesteal.k === 'lifesteal'
      && (s.used[side].lifesteal || 0) < (lifesteal.v || 2) && s.hp[side] < s.max[side] && s.hp[side] > 0) {
      s.used[side].lifesteal = (s.used[side].lifesteal || 0) + 1;
      s.hp[side] += 1;
      ev.push({ t: 'heal', side, n: 1 });
      say(s, `${nameOf(s, side)} 的嗜血链抽了一口：理智 +1。`, 'good');
    }

    if (s.hp[victim] <= 0) {
      endRound(s, foe(victim), ev);
      return { ok: true, ev };
    }
    give(s, foe(side), ev);
    afterShot(s, ev);
    return { ok: true, ev };
  }

  // 空壳
  say(s, target === 'self'
    ? `${nameOf(s, side)} 对着自己扣下扳机——空壳，回合还留着。`
    : `${nameOf(s, side)} 朝 ${nameOf(s, victim)} 开枪——空壳，什么也没发生。`,
  target === 'self' ? 'good' : 'dim');
  if (target === 'self') {
    // 「她们」：自射空壳多摸一件
    const echo = CHARS[s.chars[side]].passive;
    if (echo.k === 'echo' && (s.used[side].echo || 0) < (echo.v || 2)) {
      const it = drawItem(s, side);
      if (it) {
        s.used[side].echo = (s.used[side].echo || 0) + 1;
        ev.push({ t: 'draw', side, id: it.id, auto: true });
        say(s, `${nameOf(s, side)} 的「她们」递来一件：${ITEMS[it.id].n}。`, 'good');
      }
    }
  } else {
    give(s, foe(side), ev);
  }
  afterShot(s, ev);
  return { ok: true, ev };
}

// 一枪打完的收尾：枪膛空了就重装填（同一局里总数不变，顺序重洗）
function afterShot(s, ev) {
  if (s.phase !== 'play') return;
  if (!s.shells.length) {
    reload(s);
    ev.push({ t: 'reload' });
    say(s, '枪膛空了，重新装填——还是那么多发实弹与空壳，顺序重洗。', 'hd');
  }
}

// ---------------------------------------------------------------- 道具
function useItem(s, side, uid) {
  if (s.phase !== 'play') return { ok: false, err: '这一局已经结束了' };
  if (s.turn !== side) return { ok: false, err: '还没轮到你' };
  if (s.mute[side]) return { ok: false, err: `被「压」着，这一回合用不了道具——先开一枪吧` };
  const idx = s.items[side].findIndex((x) => x.uid === uid);
  if (idx < 0) return { ok: false, err: '你没有这件道具' };
  const it = s.items[side][idx];
  const def = ITEMS[it.id];
  if (!def) return { ok: false, err: '道具表里没有它' };

  // 用不了的场合：先说清楚，别白白吃掉道具
  if (def.k === 'cuff' && (s.cuff[foe(side)] || 0) > 0) return { ok: false, err: '对手已经被铐住了' };
  if (def.k === 'saw' && (s.saw[side] || 0) > 0) return { ok: false, err: '枪口上已经装着一把锯' };
  if (def.k === 'steal' && !s.items[foe(side)].length) return { ok: false, err: '对手身上没有道具' };
  if (def.k === 'draw' && s.items[side].length >= SLOT_MAX) return { ok: false, err: '道具已经拿满了' };
  if (def.k === 'blood' && s.hp[side] <= 1) return { ok: false, err: '理智只剩 1 点，割不动' };

  s.items[side].splice(idx, 1);
  const ev = [{ t: 'use', side, id: it.id, uid }];
  const me = nameOf(s, side);

  switch (def.k) {
    case 'peek': {
      const vals = reveal(s, side, def.v);
      ev.push({ t: 'peek', side, vals: vals.slice() });
      say(s, `${me} 举起${def.n}。`, 'hd');
      break;
    }
    case 'heal': {
      const before = s.hp[side];
      s.hp[side] = Math.min(s.max[side], s.hp[side] + def.v);
      ev.push({ t: 'heal', side, n: s.hp[side] - before });
      say(s, `${me} 用掉${def.n}：理智 +${s.hp[side] - before}。`, 'good');
      break;
    }
    case 'eject': {
      if (!s.shells.length) reload(s);
      const live = s.shells.shift();
      s.know[0].shift();
      s.know[1].shift();
      ev.push({ t: 'eject', side, live });
      say(s, `${me} 倾出一颗——${live ? '实弹' : '空壳'}，退膛了，没打出去。`, 'dim');
      if (!s.shells.length) { reload(s); ev.push({ t: 'reload' }); }
      break;
    }
    case 'saw': {
      const pc = CHARS[s.chars[side]].passive;
      let add = 1;
      // 尤乌哈希：每局前 v 把锯才是「锯齿」（+2），再往后就退回普通的 +1
      if (pc.k === 'serrate' && (s.used[side].sharp || 0) < (pc.v || 1)) {
        add = 2;
        s.used[side].sharp = (s.used[side].sharp || 0) + 1;
      }
      s.saw[side] = add;
      ev.push({ t: 'saw', side, add });
      say(s, `${me} 锯短了枪管：下一次击发 +${add} 伤害。`, 'warn');
      break;
    }
    case 'cuff': {
      s.cuff[foe(side)] = (s.cuff[foe(side)] || 0) + 1;
      ev.push({ t: 'cuff', side: foe(side) });
      say(s, `${me} 给 ${nameOf(s, foe(side))} 扣上镣铐：他下一次行动跳过。`, 'warn');
      break;
    }
    case 'pill': {
      const lucky = CHARS[s.chars[side]].passive.k === 'lucky';
      const good = lucky || rand(s) < 0.5;
      if (good) {
        const before = s.hp[side];
        s.hp[side] = Math.min(s.max[side], s.hp[side] + 2);
        ev.push({ t: 'heal', side, n: s.hp[side] - before });
        say(s, `${me} 咽下残念药剂——药效还在，理智 +${s.hp[side] - before}${lucky ? '（赌徒之运，必定成功）' : ''}。`, 'good');
      } else {
        const { real } = hurt(s, side, 1);
        ev.push({ t: 'damage', side, dmg: real, hp: s.hp[side], pill: true });
        say(s, `${me} 咽下残念药剂——过期了，理智 -${real}。`, 'bad');
        if (s.hp[side] <= 0) { endRound(s, foe(side), ev); return { ok: true, ev }; }
      }
      break;
    }
    case 'invert': {
      if (!s.shells.length) reload(s);
      s.shells[0] = !s.shells[0];
      if (s.know[side][0] !== null && s.know[side][0] !== undefined) s.know[side][0] = s.shells[0];
      ev.push({ t: 'invert', side, now: s.shells[0] });
      say(s, `${me} 拧动逆变器：这一颗现在是${s.shells[0] ? '实弹' : '空壳'}（只有他知道）。`, 'hd');
      break;
    }
    case 'steal': {
      const pool = s.items[foe(side)];
      const i = Math.floor(rand(s) * pool.length);
      const taken = pool.splice(i, 1)[0];
      s.items[side].push(taken);
      ev.push({ t: 'steal', side, from: foe(side), id: taken.id });
      say(s, `${me} 戴上窃取手套，从 ${nameOf(s, foe(side))} 身上摸走一件：${ITEMS[taken.id].n}。`, 'warn');
      break;
    }
    case 'shield': {
      s.shield[side] += def.v;
      ev.push({ t: 'shield', side, n: s.shield[side] });
      say(s, `${me} 展开护壁：护盾 ${s.shield[side]} 层。`, 'good');
      break;
    }
    case 'draw': {
      const got = drawItem(s, side);
      if (got) {
        ev.push({ t: 'draw', side, id: got.id });
        say(s, `${me} 摸到 ${ITEMS[got.id].n}。`, 'good');
      }
      break;
    }
    case 'stitch': {
      const before = s.hp[side];
      s.hp[side] = Math.min(s.max[side], s.hp[side] + 1);
      ev.push({ t: 'heal', side, n: s.hp[side] - before });
      const got = drawItem(s, side);
      if (got) ev.push({ t: 'draw', side, id: got.id });
      say(s, `${me} 用缝合针缝了缝：理智 +${s.hp[side] - before}${got ? `，顺手摸到 ${ITEMS[got.id].n}` : ''}。`, 'good');
      break;
    }
    case 'blood': {
      s.blood[side] = 1;
      s.hp[side] -= 1;
      ev.push({ t: 'damage', side, dmg: 1, hp: s.hp[side], self: true });
      say(s, `${me} 拉开血链：这一枪若命中对手 +1 伤害，自己先付 1 点理智。`, 'warn');
      break;
    }
    case 'reload': {
      reload(s);
      ev.push({ t: 'reload', seal: true });
      say(s, `${me} 按下寂灭王印：枪膛清空重装，顺序重洗。`, 'hd');
      break;
    }
    case 'loop': {
      let n = 0;
      for (let i = 0; i < 2; i++) if (drawItem(s, side)) n++;
      ev.push({ t: 'draw', side, n });
      say(s, `${me} 翻过沙漏，昨日的手又伸回口袋：摸到 ${n} 件道具，回合还在。`, 'warn');
      break;
    }
    case 'gamble': {
      if (rand(s) < 0.5) {
        let n = 0;
        for (let i = 0; i < 2; i++) if (drawItem(s, side)) n++;
        ev.push({ t: 'draw', side, n });
        say(s, `${me} 抛出筹码——赢了，摸到 ${n} 件道具。`, 'good');
      } else {
        const lost = s.items[side].length;
        s.items[side] = [];
        ev.push({ t: 'discard', side, n: lost });
        say(s, `${me} 抛出筹码——输了，手上 ${lost} 件道具全丢光。`, 'bad');
      }
      break;
    }
    default:
      break;
  }
  return { ok: true, ev };
}

// ---------------------------------------------------------------- 一局的收尾
function endRound(s, winner, ev) {
  const loser = foe(winner);
  // 环行·拉蒙娜的「回环」：整场一次，死不了
  if (CHARS[s.chars[loser]].passive.k === 'revive' && !s.rev[loser]) {
    s.rev[loser] = true;
    s.hp[loser] = 2;
    ev.push({ t: 'revive', side: loser });
    say(s, `${nameOf(s, loser)} 的回环合上了——昨日重来，理智回到 2 点，这一回合还归她。`, 'good');
    // 规则：复活者接着行动（被打倒又站起来的人，手里还有一次机会）
    give(s, loser, ev);
    return;
  }
  s.wins[winner] += 1;
  ev.push({ t: 'roundend', winner, wins: s.wins.slice(), loser });
  say(s, `第 ${s.round} 局结束：${nameOf(s, winner)} 拿下。比分 ${s.wins[0]} : ${s.wins[1]}。`, 'hd');
  if (s.wins[winner] >= s.need) {
    s.phase = 'over';
    s.winner = winner;
    ev.push({ t: 'over', winner });
    say(s, `${nameOf(s, winner)} 赢下了这一场。`, 'hd');
    return;
  }
  const n = s.round + 1;
  startRound(s, n);
  ev.push({ t: 'roundstart', round: n });
}

// 给界面用：桌面上的公开信息（谁都知道的部分）
function view(s, side) {
  return {
    round: s.round, best: s.best, need: s.need, total: s.rounds.length,
    turn: s.turn,
    wins: s.wins.slice(),
    hp: s.hp.slice(), max: s.max.slice(), shield: s.shield.slice(),
    cuff: s.cuff.slice(), saw: s.saw.slice(), blood: s.blood.slice(), mute: s.mute.slice(),
    live: liveLeft(s), blank: blankLeft(s), shells: s.shells.length,
    know: (s.know[side] || []).slice(),
    myItems: s.items[side].slice(),
    foeItems: s.items[foe(side)].slice(),
    phase: s.phase, winner: s.winner,
    logLen: s.log.length,
  };
}
return { BEST_OF, roundsFor, ROUNDS, SLOT_MAX, WIN_NEED, needFor, nameOf, charOf, foe, liveLeft, blankLeft, canAct, create, shoot, useItem, view };
})();

// ---- js/roulette/ai.js
const m_ai = await (async () => {
const { liveLeft, blankLeft, SLOT_MAX } = m_engine;
const { ITEMS } = m_items;
// 弥萨格轮盘的对手（人机那一路用的）。
//
// 三条底线：只用自己做得到的信息（s.know[side]＋公开的实弹/空壳剩数），
// 不偷看 s.shells，也不改状态——它只回一个「下一步动作」，由 view 照着喂给引擎，
// 所以人机的每一步和玩家点出来的动作完全同构（好友房不需要这一层）。
//
// 另外：它提的动作必须过引擎的合法性（同一个回合不能用两把锯、对手被铐着不能再铐……）。
// 这一层用 legal() 兜住，免得界面弹出「这一下不行」——AI 不该有无效操作。



const LEVELS = {
  easy: { item: 0.45, smart: false, blunder: 0.24 },
  normal: { item: 0.85, smart: true, blunder: 0.08 },
  hard: { item: 1, smart: true, blunder: 0 },
};

const DIFFS = [
  { k: 'easy', n: '看心情', d: '道具懒得用，常常凭直觉乱扣扳机。' },
  { k: 'normal', n: '按本分', d: '会数剩下的实弹，该用道具就用。' },
  { k: 'hard', n: '算到底', d: '每颗子弹都要算清得失，逆变器也会玩。' },
];

// 自己这一侧对「当前这颗」的判断：true 实弹 / false 空壳 / null 不知道。
// 不知道时也能从剩数反推：实弹打光了就是空壳，空壳打光了就是实弹。
function known(s, side) {
  const k = s.know[side] && s.know[side][0];
  if (k === true || k === false) return k;
  if (liveLeft(s) === 0) return false;
  if (blankLeft(s) === 0) return true;
  return null;
}

function aiStep(s, side, lv = 'normal') {
  if (s.phase !== 'play' || s.turn !== side) return null;
  const cfg = LEVELS[lv] || LEVELS.normal;
  const you = 1 - side;
  const mine = s.items[side] || [];
  const has = (id) => mine.find((x) => x.id === id);
  const myHP = s.hp[side];
  const myMax = s.max[side];
  const foeHP = s.hp[you];
  const k = known(s, side);
  const roll = (p) => Math.random() < p;
  // 道具用不用：easy 有一半时候懒得翻口袋，hard 全用
  const want = () => cfg.item >= 1 || roll(cfg.item);

  // 引擎那一侧的合法性，先过一遍
  const legal = (x) => {
    if (!x) return null;
    if (s.mute && s.mute[side]) return null;   // 被「噤声」压着：这一回合只能用枪
    const kind = ITEMS[x.id] ? ITEMS[x.id].k : '';
    if (kind === 'cuff' && (s.cuff[you] || 0) > 0) return null;
    if (kind === 'saw' && (s.saw[side] || 0) > 0) return null;
    if (kind === 'steal' && !(s.items[you] || []).length) return null;
    if (kind === 'draw' && mine.length >= SLOT_MAX) return null;
    if (kind === 'blood' && myHP <= 1) return null;
    return { t: 'item', uid: x.uid };
  };
  // 按顺序挑第一件「有、且能用的」
  const act = (...ids) => {
    for (const id of ids) {
      const a = legal(has(id));
      if (a) return a;
    }
    return null;
  };

  // 血量见底时先保命，这一条不看难度
  if (myHP <= 2 && k !== false) {
    const a = act('smoke', 'pill');
    if (a) return a;
  }
  // 白拿的信息牌：剩得多就整膛看一眼，剩一两颗就用窥镜
  if (k === null) {
    const a = s.shells.length > 3 ? act('oracle', 'scroll', 'lens') : act('lens', 'scroll', 'oracle');
    if (a && want()) return a;
  }
  if (myHP < myMax) {
    const a = act('needle');
    if (a && want()) return a;
  }
  {
    const a = act('whisper');
    if (a && want()) return a;
  }
  // 回环沙漏：白摸两件，没有代价
  {
    const a = act('hourglass');
    if (a && want()) return a;
  }
  // 手上一件都不到就敢抛筹码（输了也没什么可输的）
  if (mine.length <= 1) {
    const a = act('coin');
    if (a && want()) return a;
  }
  {
    const a = act('glove');
    if (a && (cfg.smart || want())) return a;
  }

  if (k === true) {
    // 一击必杀：直接开枪，别磨
    if (foeHP <= 1 + s.shield[you] && (s.saw[side] || 0) === 0) return { t: 'shoot', target: 'foe' };
    // 逆变器：把已知的实弹翻成空壳，然后打自己——白赚一颗实弹、保住回合
    if (cfg.smart && (liveLeft(s) > 1 || blankLeft(s) > 0) && roll(0.85)) {
      const a = act('invert');
      if (a) return a;
    }
    {
      const a = act('saw');
      if (a && want()) return a;
    }
    {
      const a = act('blood');
      if (a && want()) return a;
    }
    {
      const a = act('cuff');
      if (a && foeHP > 1 && want()) return a;
    }
    {
      const a = act('shield');
      if (a && want()) return a;
    }
    return { t: 'shoot', target: 'foe' };
  }

  if (k === false) {
    // 空壳对自己开：不扣血还保住回合，稳赚。护盾这种白拿的先用掉
    const a = act('shield');
    if (a && want()) return a;
    return { t: 'shoot', target: 'self' };
  }

  // 完全不知道：按剩下的比例赌
  const n = s.shells.length || 1;
  const pLive = liveLeft(s) / n;
  if (cfg.smart && pLive > 0.8 && roll(0.4)) {
    const a = act('seal');
    if (a) return a;
  }
  if (pLive >= 0.5 && foeHP > 1) {
    const a = act('cuff');
    if (a && want()) return a;
  }
  if (pLive >= 0.62 && foeHP > 1) {
    const a = act('saw');
    if (a && want()) return a;
  }
  if (pLive >= 0.62) {
    const a = act('shield');
    if (a && want()) return a;
  }

  // 偶尔犯错：明知道该往哪打，也可能手滑
  if (roll(cfg.blunder)) {
    const pool = mine.map((x) => legal(x)).filter(Boolean);
    if (pool.length && roll(0.5)) return pool[Math.floor(Math.random() * pool.length)];
    return { t: 'shoot', target: pLive >= 0.5 ? 'self' : 'foe' };
  }
  return { t: 'shoot', target: pLive >= 0.5 ? 'foe' : 'self' };
}
return { DIFFS, aiStep };
})();

// ---- js/duel/tiers.js
const m_tiers = await (async () => {

// 段位表与段内进度。
//
// 单独一个模块的原因：个人中心 / 排行榜要显示「这个分数是哪一段」，
// 于是 js/gamestats.js 也得引它，而 gamestats 被 account.js 带进了每一页。
// 对位表（rank.js 的 COUNTER）只在对战页用得上，不该跟着一起发到全站。
// 所以这里只放纯数据 + 三个纯函数。

// 十三段。min 是进入该段所需的积分下限，t 是这一段的称号，c 是徽章配色。
//
// 命名走游戏王那套「段位阶梯」：第 2~5 段用信物的成色往上走（铜钥 → 银钥 → 金印 → 白夜），
// 后四段换成职阶（命轮师 → 界域传说 → 唤醒大师 → 唤醒王），顶端是王者。
// 铜钥 / 银钥 / 黑印（金印）/ 白夜 / 界域都是原作里就有的东西，别随便换成别的词。
//
// 唤醒王之上的四段是「同人私设的加赛」：SS / SSS 是游戏王旧规则里「同一张卡再印一版」的叫法，
// 至尊唤醒王是把称号再往上叠一层；弥萨格校猫则来自世界观里那条规程附注——
// 「若对决中出现无法归类的现象，先确认附近有没有猫」。它不是守密人，也不该按守密人的规矩排位。
const TIERS = [
  { n: '见习守密人', t: '第一次翻开那份档案', min: 0, c: '#8b94a6' },
  { n: '铜钥级', t: '匙环上挂着自己的第一枚钥匙', min: 300, c: '#b57a4f' },
  { n: '银钥级', t: '银钥充能够转得动一次命轮', min: 700, c: '#8294ab' },
  { n: '金印级', t: '掌心被刻印烫出一个记号', min: 1200, c: '#d8a93f' },
  { n: '白夜级', t: '见过白夜，人还清醒', min: 1800, c: '#7fa9d8' },
  { n: '命轮师', t: '命轮肯听你把话说完', min: 2600, c: '#8a7ce0' },
  { n: '界域传说', t: '四个界域都记得你的名字', min: 3600, c: '#b06fd0' },
  { n: '唤醒大师', t: '不用叫，她们自己就醒了', min: 4800, c: '#e0894a' },
  { n: '唤醒王', t: '这一轮命轮由你来转', min: 6000, c: '#e0554a' },
  // —— 再往上：同一张牌再印一版，然后连印一版这件事本身都开始不够用了
  { n: '唤醒王SS', t: '同一张牌，再印一版', min: 7600, c: '#e8443c' },
  { n: '唤醒王SSS', t: '这一版连印都印得比别人的沉', min: 9400, c: '#d92d6a' },
  { n: '至尊唤醒王', t: '命轮不再转，它停在你手上', min: 11600, c: '#b23cd6' },
  { n: '弥萨格校猫', t: '规程附注第一条：先确认附近有没有猫', min: 14200, c: '#e3b341' },
];

const TOP_RP = TIERS[TIERS.length - 1].min;

const DIFF_TXT = { easy: '轻松', normal: '普通', hard: '认真' };

function tierOf(rp) {
  const v = Math.max(0, Math.round(Number(rp) || 0));
  let i = 0;
  for (let k = 0; k < TIERS.length; k++) if (v >= TIERS[k].min) i = k;
  return i;
}

// 这一段的进度：进了多少分、离下一段还差多少、百分比、以及段内的三颗小星。
// 到了最高段就没有「下一段」，进度条按满算。
function progress(rp) {
  const v = Math.max(0, Math.round(Number(rp) || 0));
  const idx = tierOf(v);
  const tier = TIERS[idx];
  const next = idx + 1 < TIERS.length ? TIERS[idx + 1] : null;
  const span = next ? next.min - tier.min : 1;
  const into = v - tier.min;
  const pct = next ? Math.max(0, Math.min(100, (into / span) * 100)) : 100;
  // 段内三颗星：刚进这一段就有一颗，走到三等分处点第二颗、再点第三颗
  const stars = next ? Math.min(3, Math.floor((into / span) * 3) + 1) : 3;
  return {
    rp: v, idx, tier, next, into, span, pct, stars,
    left: next ? Math.max(0, next.min - v) : 0,       // 还差多少分进下一段
  };
}
return { TIERS, TOP_RP, DIFF_TXT, tierOf, progress };
})();

// ---- js/roulette/rank.js
const m_rank = await (async () => {
const { TIERS } = m_tiers;
// 弥萨格轮盘的段位（只算人机对战，和「唤醒王：决斗链接」共用一套段位表）。
//
// 为什么共用 duel/tiers.js：站上只有一个段位体系，玩家在两个游戏里看到的
// 「铜钥级 / 金印级 / 唤醒王」应该是同一件事，不然个人中心会出现两套不相干的称号。
//
// 积分只增不减——理由和决斗那边一样（见 js/duel/rank.js 开头）：云端档案是逐项取大合并的，
// 允许掉分两台设备就会互相拉回去。水平差距靠三件事体现：
//   1. 连胜加成：赢得连贯爬得快；
//   2. 段位越高，人机档位至少抬到「普通 / 认真」（见 floorFor），难度定起点、段位往上抬；
//   3. 段位越高，人机挑的出战唤醒体越强（见 foePool，用的是实测胜率分位）。


// 赢一局的基础分。五局三胜是长盘，同样的胜负给的更多（1.4 倍）。
const WIN_BASE = { easy: 70, normal: 95, hard: 120 };
const LOSE_BASE = 12;

function gainFor(opt) {
  const o = opt || {};
  const diff = WIN_BASE[o.diff] != null ? o.diff : 'normal';
  const tier = Math.max(0, Math.min(TIERS.length - 1, Number(o.tier) || 0));
  const streak = Math.max(0, Number(o.streak) || 0);
  if (!o.win) return LOSE_BASE;
  const raw = WIN_BASE[diff] + tier * 10 + Math.min(streak, 5) * 8;
  return Math.round(raw * (Number(o.best) === 5 ? 1.4 : 1));
}

const DIFF_RANK = { easy: 0, normal: 1, hard: 2 };

// 这一档段位下，人机至少是几档：段位越高，你自己选的「看心情」也会被抬上去。
function floorFor(tier) {
  const t = Math.max(0, Number(tier) || 0);
  if (t >= 6) return 'hard';
  if (t >= 3) return 'normal';
  return 'easy';
}

function effectiveDiff(tier, diff) {
  const mine = DIFF_RANK[diff] != null ? DIFF_RANK[diff] : 1;
  const floor = DIFF_RANK[floorFor(tier)];
  return mine >= floor ? diff : floorFor(tier);
}

// 人机挑人的范围：低段位随便挑，中段位从中上开始，高段位只挑最会打的。
// POWER 是 scripts/roulette-power.mjs 测出来的胜率分位（0~1），没有这份数据就退回全名单。
function foePool(tier, POWER, list) {
  const t = Math.max(0, Number(tier) || 0);
  if (!POWER) return list.slice();
  const worst = t >= 6 ? 0.72 : t >= 3 ? 0.45 : 0;
  const pool = list.filter((id) => (POWER[id] == null ? 0.5 : POWER[id]) >= worst);
  return pool.length ? pool : list.slice();
}
return { gainFor, DIFF_RANK, floorFor, effectiveDiff, foePool };
})();

// ---- js/roulette/net.js
const m_net = await (async () => {

// 好友房：这个站没有自己的后端，房间借一个公共的 pub/sub 当中继信箱——
// 双方订阅同一个「房间主题」，自己发的消息自己也会收到，用 from 过滤掉。
//
// 和唤醒王：决斗链接（js/duel/net.js）是同一套路子，只是换了主题前缀：
// 两个游戏同时开房不会串台。前缀变了也别改长度——房间码 5 位、全大写，
// 念给朋友听不会错（去掉了 I O 0 1）。
//
// 协议（每条消息都是这一层 JSON）：
//   { k:'hi',   role:'a'|'b', ch:'a-15567' }       握手，每 3 秒重发直到对方应答
//   { k:'open', seed:123, a:'a-15567', b:'a-15576' }  房主定种子与双方唤醒体（a=房主）
//   { k:'ack' }                                     客人收到 open
//   { k:'act',  n:1, a:{t:'shoot',target:'foe'} }   动作，n 从 1 递增，双方按序重放
//   { k:'ping' } / { k:'bye' }
const RELAY = 'https://ntfy.sh';
const PREFIX = 'mrr1-';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉 I O 0 1

function makeCode() {
  let s = '';
  for (let i = 0; i < 5; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return s;
}

function normCode(v) {
  const s = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 5 ? s : '';
}

function roomUrl(code) {
  return RELAY + '/' + PREFIX + String(code).toLowerCase();
}

// onMsg(payload) / onState('on'|'err'|'closed')
function connect(code, onMsg, onState) {
  const url = roomUrl(code);
  const me = 'c' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  let es = null;
  let closed = false;

  try {
    es = new EventSource(url + '/sse');
    es.onopen = () => { if (onState) onState('on'); };
    es.onerror = () => { if (!closed && onState) onState('err'); }; // EventSource 自己会重连
    es.onmessage = (ev) => {
      let box = null;
      try { box = JSON.parse(ev.data); } catch (e) { return; }
      if (!box || box.event !== 'message' || !box.message) return; // keepalive / open 事件
      let p = null;
      try { p = JSON.parse(box.message); } catch (e) { return; }
      if (!p || p.from === me) return;
      if (onMsg) onMsg(p, box.time || 0);
    };
  } catch (e) {
    if (onState) onState('err');
  }

  return {
    code,
    me,
    send(obj) {
      if (closed) return;
      const body = JSON.stringify(Object.assign({}, obj, { from: me }));
      fetch(url, { method: 'POST', body, headers: { 'X-Title': 'morimens-roulette' } })
        .catch(() => { if (onState) onState('err'); });
    },
    close() {
      closed = true;
      try { if (es) es.close(); } catch (e) { /* 已经关了 */ }
    },
  };
}
return { makeCode, normCode, roomUrl, connect };
})();

// ---- js/roulette/view.js
const m_view = await (async () => {
const { CHAR_ORDER, CHARS, POWER, CREATORS } = m_gen;
const { ITEMS, ITEM_ORDER } = m_items;
const { create, shoot, useItem, view, roundsFor, BEST_OF } = m_engine;
const { aiStep, DIFFS } = m_ai;
const { gainFor, effectiveDiff, foePool } = m_rank;
const { progress: rankProgress, TIERS } = m_tiers;
const net = m_net;
// 弥萨格轮盘的界面层：把引擎的确定性状态画成一张赌桌，并把玩家/对手的操作喂回去。
//
// 人机、同屏、好友房三种模式共用同一套渲染与动作管线——差别只有两点：
//   1) 谁在操作（人机＝AI 定时驱动，同屏＝当前行动的一方，好友房＝本机那一侧）；
//   2) 动作要不要发出去（好友房发，其它不发）。
// 所以「动作只有一条路」这件事必须守住：任何点击都走 doAction()，
// 一旦有人绕过它直接改状态，两台机器的 s 就会分叉，房间立刻不同步。








const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const S = {
  mode: 'ai',
  diff: 'normal',
  best: 3,          // 赛制：3 = 三局两胜，5 = 五局三胜
  aiLv: 'normal',   // 这一场人机实际用的档位（段位会把难度抬上去）
  q: '',            // 选人搜索框
  tab: 'all',       // 选人筛选：all / 界域名 / creator
  pick: [null, null],
  picking: 0,
  expect: 1,        // 这一轮要选几个人（人机/好友房 1，同屏 2）
  s: null,          // 引擎状态
  me: 0,            // 本机是第几侧（好友房：房主 0、客人 1）
  viewer: 0,        // 这一屏以谁的眼睛在看（同屏＝当前行动方）
  net: null, room: null, peer: null,
  seq: 0, remoteSeq: 0, hiTimer: 0,
  token: 0,         // 每次重开 +1，用来作废上一局遗留的 AI 定时器
  busy: false,
  muted: false,
  stats: { w: 0, l: 0, streak: 0, best: 0, rp: 0, bestStreak: 0 },
};

// ---------------------------------------------------------------- 存档小工具
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* 无痕模式 */ } };
// 存档键统一挂在 zjtt: 前缀下。js/gamestats.js（个人中心 / 云端档案摘要 / 首页排行榜）
// 读的是 zjtt:roulette:v1——第一版这里写成了裸 'roulette:v1'，于是战绩和段位分只存在本机，
// 上报时永远是空数组，榜单上也永远不会出现这个游戏。
const STATS_KEY = 'zjtt:roulette:v1';
const OLD_KEYS = { stats: 'roulette:v1', diff: 'roulette:diff', best: 'roulette:best', mute: 'roulette:mute' };
// 老版本写的是裸键：第一次读先看新键，没有就把旧值搬过来（旧键留着，回滚也不会丢）
function lsPick(k, oldK) {
  const v = lsGet(k);
  if (v != null) return v;
  const o = lsGet(oldK);
  if (o != null) lsSet(k, o);
  return o;
}

function loadStats() {
  try {
    const j = JSON.parse(lsPick(STATS_KEY, OLD_KEYS.stats) || '{}');
    S.stats = {
      w: j.w | 0, l: j.l | 0, streak: j.streak | 0, best: j.best | 0,
      rp: Math.max(0, j.rp | 0), bestStreak: j.bestStreak | 0,
    };
    // 老存档只有 w/l：段位分从 0 起算，连胜数沿用原来的
    if (!S.stats.bestStreak) S.stats.bestStreak = S.stats.best;
  } catch (e) { /* 存档坏了就当没有 */ }
}
function saveStats() {
  lsSet(STATS_KEY, JSON.stringify(S.stats));
}

// 银芯钱包：全站共用 zjtt:credits（有人写 JSON 数字、有人写裸数字，两种都认）
function walletGet() {
  const raw = lsGet('zjtt:credits');
  if (!raw) return 0;
  try { const v = Number(JSON.parse(raw)); if (Number.isFinite(v)) return Math.max(0, Math.round(v)); } catch (e) { /* 裸数字 */ }
  const v = parseInt(raw, 10);
  return Math.max(0, Number.isFinite(v) ? v : 0);
}
function walletAdd(n) {
  const add = Math.max(0, Math.round(n));
  if (!add) return;
  lsSet('zjtt:credits', String(walletGet() + add));
  document.dispatchEvent(new CustomEvent('zjtt:dirty', { detail: 'credits' }));
}

// ---------------------------------------------------------------- 音效（现场合成，不带音频文件）
const sfx = {
  ctx: null,
  on() { return !S.muted; },
  init() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { this.ctx = new C(); } catch (e) { return null; }
    }
    if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) { /* 用户还没交互 */ } }
    return this.ctx;
  },
  noise(dur, freq, peak) {
    const c = this.init();
    if (!c) return;
    const len = Math.round(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = c.createBufferSource(); src.buffer = buf;
    const flt = c.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(peak, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0008, c.currentTime + dur);
    src.connect(flt).connect(g).connect(c.destination);
    src.start();
  },
  tone(freq, dur, type, peak) {
    const c = this.init();
    if (!c) return;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(peak || 0.12, c.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  },
  blast() { if (this.on()) { this.noise(0.34, 1400, 0.5); this.tone(70, 0.26, 'sine', 0.35); } },
  dry() { if (this.on()) { this.noise(0.1, 2600, 0.14); this.tone(220, 0.06, 'square', 0.05); } },
  click() { if (this.on()) this.tone(320, 0.05, 'square', 0.06); },
  heal() { if (this.on()) { this.tone(660, 0.12, 'sine', 0.1); setTimeout(() => this.tone(880, 0.14, 'sine', 0.09), 90); } },
  bad() { if (this.on()) this.tone(150, 0.28, 'sawtooth', 0.12); },
  win() { if (this.on()) [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.1), i * 110)); },
  lose() { if (this.on()) [392, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.1), i * 150)); },
};

const vibrate = (n) => { try { if (navigator.vibrate) navigator.vibrate(n); } catch (e) { /* 不支持就算了 */ } };

// ---------------------------------------------------------------- 那把枪
function gunSVG() {
  return `<svg viewBox="0 0 240 76" fill="none" aria-hidden="true">
  <defs>
    <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3d4353"/><stop offset=".55" stop-color="#252a35"/><stop offset="1" stop-color="#141820"/>
    </linearGradient>
    <linearGradient id="gw" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5d4634"/><stop offset="1" stop-color="#31241a"/>
    </linearGradient>
  </defs>
  <g class="flash"><circle cx="14" cy="33" r="14" fill="#ffd27a" opacity=".85"/><circle cx="11" cy="33" r="6.5" fill="#fff"/></g>
  <rect x="18" y="26" width="130" height="13" rx="4" fill="url(#gm)" stroke="#4b5263" stroke-width="1.2"/>
  <rect x="18" y="39" width="130" height="5" rx="2.5" fill="#191c24" opacity=".85"/>
  <ellipse cx="19" cy="32.5" rx="3.4" ry="6.6" fill="#0a0c11" stroke="#5b6274" stroke-width="1.2"/>
  <ellipse cx="19" cy="32.5" rx="1.7" ry="3.4" fill="#000"/>
  <rect x="58" y="42" width="54" height="8" rx="3" fill="url(#gw)" stroke="#6b5138" stroke-width="1"/>
  <rect x="146" y="22" width="40" height="26" rx="5" fill="url(#gm)" stroke="#4b5263" stroke-width="1.2"/>
  <rect x="152" y="26" width="28" height="3" rx="1.5" fill="#e3b341" opacity=".5"/>
  <path d="M186 26q10-6 14 2l-4 5q-5-4-10-2z" fill="#3a4150" stroke="#5b6274" stroke-width="1"/>
  <path d="M186 34q26-6 40 6l6 18q-16 8-34 2l-16-10z" fill="url(#gw)" stroke="#6b5138" stroke-width="1.2"/>
  <path d="M160 48q0 12 12 12h6" stroke="#4b5263" stroke-width="3" stroke-linecap="round"/>
  <path d="M166 46q4 8 0 11" stroke="#7c8496" stroke-width="3" stroke-linecap="round"/>
</svg>`;
}

// ---------------------------------------------------------------- 屏切换
const SCREENS = ['home', 'pick', 'room', 'battle'];
function show(name) {
  for (const id of SCREENS) {
    const el = document.getElementById('scr-' + id);
    if (el) el.hidden = id !== name;
  }
  $('#sub').textContent = name === 'battle' ? `第 ${S.s ? S.s.round : 1} 局 · ${fmtBest(S.best)}`
    : name === 'pick' ? '选出战的唤醒体'
      : name === 'room' ? '好友房' : '一把枪、一膛子弹、两个人';
  if (name === 'home') renderHome();
  if (name === 'pick') renderPick();
}

// ---------------------------------------------------------------- 首页
const fmtBest = (b) => (Number(b) === 5 ? '五局三胜' : '三局两胜');

function rankCardHTML() {
  const p = rankProgress(S.stats.rp);
  const tier = p.tier;
  // 段位会把「看心情」往上抬：先告诉玩家这一档实际会打成什么样
  const eff = effectiveDiff(p.idx, S.diff);
  const effName = (DIFFS.find((d) => d.k === eff) || { n: '' }).n;
  return `<div class="rk" style="--rc:${tier.c}">
    <div class="rk-h">
      <b>${esc(tier.n)}</b>
      <span>${p.rp} 分</span>
    </div>
    <div class="rk-bar"><i style="width:${p.pct}%"></i></div>
    <div class="rk-n">${p.next ? `距「${esc(p.next.n)}」还差 <b>${p.left}</b> 分` : '已经是最高段位——命轮由你来转'}
      <span class="rk-eff">这一档人机实际按「${esc(effName || '普通')}」打</span></div>
  </div>`;
}

function renderHome() {
  $('#diffRow').innerHTML = '<span class="lb">人机难度</span>' + DIFFS.map((d) => (
    `<button type="button" data-diff="${d.k}" aria-pressed="${d.k === S.diff}" title="${esc(d.d)}">${esc(d.n)}</button>`
  )).join('');
  $('#bestRow').innerHTML = '<span class="lb">赛制</span>' + BEST_OF.map((b) => (
    `<button type="button" data-best="${b}" aria-pressed="${b === S.best}" title="${b === 5 ? '谁先赢三局' : '谁先赢两局'}">${fmtBest(b)}</button>`
  )).join('');
  $('#rankCard').innerHTML = rankCardHTML();
  const st = S.stats;
  const rate = st.w + st.l ? Math.round((st.w / (st.w + st.l)) * 100) : 0;
  $('#rec').innerHTML = st.w + st.l
    ? `人机战绩 <b>${st.w}</b> 胜 <b>${st.l}</b> 负（${rate}%）· 当前连胜 <b>${st.streak}</b> · 最高 <b>${st.bestStreak}</b> 连胜`
    : '还没有人机战绩。同屏与好友房不记账——那两样是跟人打的，不算数；段位也只认人机。';
}

// ---------------------------------------------------------------- 选人
function cardOf(id) { return CHARS[id]; }

// 选人筛选：界域（四个）＋ 主播，另配一个搜索框。73 个人一屏滚下来太长了。
const REALMS = ['混沌', '血肉', '深海', '超维'];
const TABS = [['all', '全部'], ...REALMS.map((r) => [r, r]), ['creator', '主播']];

function matchQuery(c, q) {
  if (!q) return true;
  const hay = [c.n, c.en || '', c.realm, c.role, c.passive.n, ...c.items.map((i) => ITEMS[i].n)].join('|').toLowerCase();
  return hay.indexOf(q) >= 0;
}

function pickList() {
  const q = S.q.trim().toLowerCase();
  return CHAR_ORDER.filter((id) => {
    const c = CHARS[id];
    if (S.tab === 'creator' && !c.creator) return false;
    if (S.tab !== 'all' && S.tab !== 'creator' && c.realm !== S.tab) return false;
    return matchQuery(c, q);
  });
}

function renderPick() {
  const need = S.expect;
  const idx = S.picking;
  $('#pickHint').innerHTML = need === 1
    ? `选一位出战的唤醒体——理智上限、随身道具和被动就是你这局的本钱。<span class="ph-n">共 ${CHAR_ORDER.length} 位：${CHAR_ORDER.length - CREATORS.length} 名唤醒体 + ${CREATORS.length} 位主播</span>`
    : `同屏双人：先给 <b>${idx === 0 ? '玩家一' : '玩家二'}</b> 选一位。`;
  $('#pickTabs').innerHTML = TABS.map(([k, n]) => (
    `<button type="button" data-tab="${k}" aria-pressed="${k === S.tab}">${esc(n)}</button>`
  )).join('');
  const ids = pickList();
  const grid = $('#pickGrid');
  grid.innerHTML = ids.length ? ids.map((id) => {
    const c = CHARS[id];
    const on = S.pick[idx] === id;
    const taken = need === 2 && S.pick[1 - idx] === id && idx === 1;
    return `<button class="pcard" type="button" data-pick="${id}" aria-pressed="${on}" ${taken ? 'disabled' : ''}>
      <img src="${c.face}" alt="" width="44" height="44" decoding="async">
      <div class="pm">
        <div class="pn">${esc(c.n)}${c.creator ? '<span class="cb">主播</span>' : ''}</div>
        <div class="pt">${esc(c.realm)} · ${esc(c.role)} · 理智 ${c.hp}</div>
        <div class="pp">${esc(c.passive.n)}：${esc(c.passive.d)}</div>
        <div class="php">随身：${c.items.map((i) => esc(ITEMS[i].n)).join(' / ')}</div>
      </div>
    </button>`;
  }).join('') : '<p class="hint" style="grid-column:1/-1">没搜到——换个字试试，或者点「全部」。</p>';
  $('#pickGo').disabled = !S.pick[idx];
  $('#pickGo').textContent = need === 1 ? '就她了'
    : (idx === 0 ? '下一位' : '开打');
  $('#pickBack').textContent = idx === 0 ? '返回' : '上一位';
  // 卡面上的被动被截成两行（73 张卡滚下来太长）：选中之后在吸底条里读全文
  const cur = S.pick[idx] ? CHARS[S.pick[idx]] : null;
  const info = $('#pickInfo');
  if (info) {
    info.innerHTML = cur
      ? `<b>${esc(cur.n)}</b> · ${esc(cur.realm)} · ${esc(cur.role)} · 理智 ${cur.hp} · 随身 ${cur.items.map((i) => esc(ITEMS[i].n)).join(' / ')}<br>
         <span class="pw">${esc(cur.passive.n)}</span>：${esc(cur.passive.d)}`
      : '点一张卡看她的被动全文——理智上限、随身道具和被动就是你这局的本钱。';
  }
}

function pickChar(id) {
  S.pick[S.picking] = id;
  renderPick();
  sfx.click();
}

// 人机挑人：段位越高，它挑的越靠前（scripts/roulette-power.mjs 量的胜率分位）。
// 和决斗链接的「对手按对位表挑牌组」是一回事——不给它加血，只让它选个更能打的。
function pickFoeId(myId) {
  const tier = rankProgress(S.stats.rp).idx;
  const pool = foePool(tier, POWER, CHAR_ORDER).filter((id) => id !== myId);
  const list = pool.length ? pool : CHAR_ORDER.filter((id) => id !== myId);
  return list[Math.floor(Math.random() * list.length)];
}

function pickNext() {
  if (!S.pick[S.picking]) return;
  if (S.picking < S.expect - 1) { S.picking += 1; renderPick(); sfx.click(); return; }
  if (S.mode === 'net') { openNetSheet(); return; }
  if (S.mode === 'hot') { startMatch([S.pick[0], S.pick[1]], 0); return; }
  const foeId = pickFoeId(S.pick[0]);
  // 段位会把人机档位往上抬（见 rank.js 的 floorFor）
  S.aiLv = effectiveDiff(rankProgress(S.stats.rp).idx, S.diff);
  startMatch([S.pick[0], foeId], 0);
}

// ---------------------------------------------------------------- 开局
function newSeed() { return ((Date.now() & 0x7fffffff) ^ (Math.random() * 0xffffffff)) >>> 0; }

function startMatch(chars, meSide) {
  S.s = create(newSeed(), chars, { best: S.best });
  S.me = meSide;
  S.token += 1;
  S.busy = false;
  hideOv();
  show('battle');
  renderBattle();
  afterAction();
}

// ---------------------------------------------------------------- 战场渲染
function chipHTML(it, mine) {
  const d = ITEMS[it.id];
  if (!mine) {
    return `<span class="chip mini c-${d.c}" title="${esc(d.n)}：${esc(d.d)}"><i>${esc(d.g)}</i></span>`;
  }
  return `<button class="chip c-${d.c}" type="button" data-uid="${it.uid}" title="${esc(d.n)}：${esc(d.d)}">
    <i>${esc(d.g)}</i><span>${esc(d.n)}</span></button>`;
}

function cardHTML(side) {
  const s = S.s;
  const c = CHARS[s.chars[side]];
  const hp = Math.max(0, s.hp[side]);
  const max = s.max[side];
  const pips = Array.from({ length: max }, (_, i) => `<i class="${i < hp ? 'on' : ''}"></i>`).join('');
  const bdg = [];
  if (s.shield[side]) bdg.push(`<i class="sh">护盾 ${s.shield[side]}</i>`);
  if (s.cuff[side]) bdg.push(`<i class="cf">镣铐 ${s.cuff[side]}</i>`);
  if (s.saw[side]) bdg.push(`<i class="sw">锯 +${s.saw[side]}</i>`);
  if (s.blood[side]) bdg.push('<i class="bl">血链</i>');
  if (s.mute[side]) bdg.push('<i class="mu">压制</i>');
  const items = s.items[side];
  // 自己的道具在下面那排「道具格」里已经有了一份，卡上只画对手的（省地方，也不重复）
  const chips = side === S.viewer ? ''
    : (items.length
      ? items.map((it) => chipHTML(it, false)).join('')
      : Array.from({ length: 2 }, () => '<span class="chip empty" aria-hidden="true"></span>').join(''));
  const acting = s.turn === side && s.phase === 'play';
  return `<img class="av" src="${c.face}" alt="" width="46" height="46" decoding="async">
    <div class="hf">
      <div class="nm"><b>${esc(c.n)}</b><span>${esc(c.realm)} · ${esc(c.role)}</span></div>
      <div class="pips">${pips}<span class="hpn">${hp}/${max}</span></div>
      ${bdg.length ? `<div class="bdgs">${bdg.join('')}</div>` : ''}
    </div>
    <div class="chips" data-side="${side}">${chips}</div>`;
}

function renderBattle() {
  const s = S.s;
  if (!s) return;
  // 同屏双人：谁的回合谁在下面（看着的人和操作的人是同一个）
  S.viewer = S.mode === 'hot' ? s.turn : S.me;
  const v = view(s, S.viewer);
  const foeSide = 1 - S.viewer;

  const foe = $('#foeCard'); const me = $('#meCard');
  foe.innerHTML = cardHTML(foeSide);
  me.innerHTML = cardHTML(S.viewer);
  foe.className = 'side' + (s.turn === foeSide && s.phase === 'play' ? ' acting' : '') + (s.hp[foeSide] <= 0 ? ' dead' : '');
  me.className = 'side' + (s.turn === S.viewer && s.phase === 'play' ? ' acting' : '') + (s.hp[S.viewer] <= 0 ? ' dead' : '');

  $('#nLive').textContent = v.live;
  $('#nBlank').textContent = v.blank;

  const tb = $('#turnBadge');
  const mine = s.turn === S.viewer;
  tb.className = 'turnbadge ' + (mine ? 'me' : 'foe');
  tb.textContent = s.phase === 'over' ? '结束'
    : (S.mode === 'hot' ? (mine ? '你的回合' : '对手回合') : (mine ? '你的回合' : '对手回合'));

  // 枪膛里还剩几颗：只把「本屏这个人知道的」点亮
  const know = s.know[S.viewer] || [];
  $('#rack').innerHTML = s.shells.map((_, i) => {
    const k = know[i];
    const cls = k === true ? 'seen live' : k === false ? 'seen blank' : '';
    return `<i class="${cls}" title="第 ${i + 1} 颗"></i>`;
  }).join('');

  // 道具格（只有自己的能点）
  $('#myChips').innerHTML = s.items[S.viewer].length
    ? s.items[S.viewer].map((it) => chipHTML(it, true)).join('')
    : '<span class="hint" style="font-size:11px">手上没有道具了</span>';

  const canShoot = s.phase === 'play' && s.turn === S.viewer && !S.busy;
  $('#shootSelf').disabled = !canShoot;
  $('#shootFoe').disabled = !canShoot;
  for (const b of $('#myChips').querySelectorAll('button[data-uid]')) {
    b.disabled = !canShoot;
  }

  const last = s.log[s.log.length - 1];
  const sayEl = $('#say');
  sayEl.textContent = last ? last.txt : '装填完毕。';
  sayEl.className = 'say ' + (last ? last.cls : '');

  $('#sub').textContent = `第 ${s.round} / ${s.rounds.length} 局 · ${fmtBest(s.best)} · ${s.wins[0]} : ${s.wins[1]}`;
}

// ---------------------------------------------------------------- 动画
function floatOn(sel, txt, cls) {
  const host = document.querySelector(sel);
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'float ' + (cls || '');
  el.textContent = txt;
  host.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function gunFire() {
  const g = $('#gun');
  if (!g) return;
  g.classList.remove('fire');
  void g.offsetWidth;
  g.classList.add('fire');
}

function animate(ev) {
  const s = S.s;
  let shake = false;
  let hitSide = null;
  const floats = [];
  for (const e of ev) {
    if (e.t === 'shot') {
      gunFire();
      if (e.live) { shake = true; hitSide = e.side; sfx.blast(); vibrate(35); } else { sfx.dry(); }
    } else if (e.t === 'damage') {
      floats.push({ side: e.side, txt: `-${e.dmg}`, cls: 'dmg' });
      hitSide = e.side;
      if (!e.self && e.pill !== true) sfx.bad();
    } else if (e.t === 'heal' && e.n > 0) {
      floats.push({ side: e.side, txt: `+${e.n}`, cls: 'heal' });
      sfx.heal();
    } else if (e.t === 'peek') {
      const val = e.vals && e.vals.length ? e.vals[0] : null;
      if (val !== null && val !== undefined) {
        floatOn('.rack', val ? '实弹' : '空壳', 'info');
      }
    } else if (e.t === 'revive') {
      floats.push({ side: e.side, txt: '回环', cls: 'info' });
      sfx.heal();
    } else if (e.t === 'roundend' || e.t === 'over') {
      // 结算浮层在 afterAction 里统一弹
    }
  }
  renderBattle();
  if (shake) {
    document.body.classList.remove('shake');
    void document.body.offsetWidth;
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 400);
  }
  if (hitSide !== null) {
    const el = hitSide === S.viewer ? $('#meCard') : $('#foeCard');
    if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
  }
  for (const f of floats) {
    floatOn(f.side === S.viewer ? '#meCard' : '#foeCard', f.txt, f.cls);
  }
  if (s.phase === 'over') setTimeout(showResult, 700);
}

// ---------------------------------------------------------------- 动作
function doAction(a, remote) {
  const s = S.s;
  if (!s || s.phase !== 'play') return { ok: false };
  const side = s.turn;
  const r = a.t === 'shoot' ? shoot(s, side, a.target) : useItem(s, side, a.uid);
  if (!r.ok) {
    if (!remote) toast(r.err || '这一下不行');
    return r;
  }
  if (!remote && S.mode === 'net' && S.net) {
    S.seq += 1;
    S.net.send({ k: 'act', n: S.seq, a });
  }
  animate(r.ev);
  afterAction();
  return r;
}

// 一手指完之后收尾：谁该动就动，没人动就等人
function afterAction() {
  const s = S.s;
  if (!s) return;
  if (s.phase === 'over') {
    setTimeout(showResult, 900);
    return;
  }
  if (S.mode === 'ai' && s.turn !== S.me) driveAi();
}

function driveAi() {
  const s = S.s;
  if (S.mode !== 'ai' || !s || s.phase !== 'play' || s.turn === S.me) return;
  const tok = S.token;
  const a = aiStep(s, s.turn, S.aiLv || S.diff);
  if (!a) return;
  const delay = 520 + Math.round(Math.random() * 320);
  setTimeout(() => {
    if (tok !== S.token || !S.s || S.s.phase !== 'play' || S.s.turn === S.me) return;
    let r = a.t === 'shoot' ? shoot(S.s, S.s.turn, a.target) : useItem(S.s, S.s.turn, a.uid);
    if (!r.ok) r = shoot(S.s, S.s.turn, 'foe'); // 兜底：道具点不动就直接开枪
    if (!r.ok) return;
    animate(r.ev);
    afterAction();
  }, delay);
}

// ---------------------------------------------------------------- 结算
function showResult() {
  const s = S.s;
  if (!s || s.phase !== 'over') return;
  const ov = $('#ov');
  if (!ov.hidden) return;
  const win = s.winner === S.viewer;
  const hot = S.mode === 'hot';
  $('#ovk').textContent = hot ? '这一场' : (win ? '你赢了' : '你输了');
  const t = $('#ovt');
  t.textContent = hot ? `${CHARS[s.chars[s.winner]].n} 赢` : (win ? '活下来了' : '留在了桌上');
  t.className = 'big ' + (win || hot ? 'win' : 'lose');
  $('#ovs').innerHTML = `比分 <b>${s.wins[0]} : ${s.wins[1]}</b>　（${fmtBest(s.best)}）`;

  let tip = '';
  let rankHtml = '';
  if (S.mode === 'ai') {
    const rk0 = rankProgress(S.stats.rp);
    if (win) {
      S.stats.w += 1;
      S.stats.streak += 1;
      if (S.stats.streak > S.stats.bestStreak) S.stats.bestStreak = S.stats.streak;
      S.stats.best = S.stats.streak;
      const sweep = s.wins[1] === 0;
      // 五局三胜更长，银芯也多给一点
      const bonus = (S.best === 5 ? 5 : 3) + (sweep ? 2 : 0);
      walletAdd(bonus);
      tip = `银芯 +${bonus}${sweep ? '（横扫额外 +2）' : ''}。`;
      sfx.win();
    } else {
      S.stats.l += 1;
      S.stats.streak = 0;
      walletAdd(1);
      tip = '银芯 +1（输也有参与奖）。';
      sfx.lose();
    }
    // 段位分：只算人机。难度用的是「段位抬过之后」的实际档位，
    // 所以高段位选「看心情」也拿不到低难度的分。
    const gain = gainFor({
      win, diff: S.aiLv || S.diff, tier: rk0.idx, streak: S.stats.streak, best: S.best,
    });
    S.stats.rp += gain;
    saveStats();
    const rk = rankProgress(S.stats.rp);
    rankHtml = `<div class="rkg" style="--rc:${rk.tier.c}">
      <div class="rk-h"><b>${esc(rk.tier.n)}</b><span>段位 <b>+${gain}</b>${S.stats.streak > 1 ? ` · ${S.stats.streak} 连胜` : ''}</span></div>
      <div class="rk-bar"><i style="width:${rk.pct}%"></i></div>
      <div class="rk-n">${rk.idx > rk0.idx ? `<b class="up">升段！</b>` : ''}${rk.next ? `距「${esc(rk.next.n)}」还差 <b>${rk.left}</b> 分` : '已经是最高段位'}</div>
    </div>`;
    const rate = Math.round((S.stats.w / (S.stats.w + S.stats.l)) * 100);
    tip += ` 人机战绩 ${S.stats.w} 胜 ${S.stats.l} 负（${rate}%）。`;
  } else if (hot) {
    tip = '同屏双人不记账：换个人再来。';
    sfx.win();
  } else {
    tip = win ? '这一把算你跟朋友之间的账。' : '房间还在，让房主再开一局。';
    if (win) sfx.win(); else sfx.lose();
  }
  $('#ovd').textContent = tip;
  $('#ovRank').innerHTML = rankHtml;
  const again = $('#ovAgain');
  again.textContent = S.mode === 'net' ? '回大厅' : '再来一局';
  ov.hidden = false;
}

function hideOv() { $('#ov').hidden = true; }

// ---------------------------------------------------------------- 好友房
function openNetSheet() {
  const html = `
    <p>房间靠一个公共中继转消息，所以不用登录。房主先手；两个人各选自己的唤醒体。</p>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn pri" type="button" id="mkRoom">开一间房</button>
    </div>
    <h4>或者进朋友的房</h4>
    <div style="display:flex;gap:8px">
      <input id="joinCode" maxlength="5" placeholder="5 位房间码" style="flex:1;height:40px;padding:0 10px;border-radius:10px;border:1px solid var(--line2);background:var(--bg2);color:var(--text);letter-spacing:.2em;text-transform:uppercase">
      <button class="btn ghost" type="button" id="doJoin" style="flex:0 0 88px">加入</button>
    </div>`;
  sheet('好友房', html);
  $('#mkRoom').onclick = () => { closeSheet(); hostRoom(); };
  $('#doJoin').onclick = () => {
    const code = net.normCode($('#joinCode').value);
    if (!code) { toast('房间码是 5 位，字母数字都行'); return; }
    closeSheet();
    joinRoom(code);
  };
}

function roomStateUI(txt, cls) {
  const st = $('#roomState');
  const dot = $('#roomDot');
  if (st) st.textContent = txt;
  if (dot) dot.className = cls || '';
}

function hostRoom() {
  const code = net.makeCode();
  S.room = { code, role: 'a', state: 'wait' };
  S.mode = 'net';
  show('room');
  $('#roomK').textContent = '把下面这个房间码念给朋友';
  $('#roomCode').textContent = code;
  roomStateUI('正在连中继…', '');
  S.net = net.connect(code, onNetMsg, onNetState);
  const hi = () => { if (S.room && S.room.state === 'wait' && S.net) S.net.send({ k: 'hi', role: 'a', ch: S.pick[0] }); };
  hi();
  clearInterval(S.hiTimer);
  S.hiTimer = setInterval(hi, 3000);
}

function joinRoom(code) {
  S.room = { code, role: 'b', state: 'wait' };
  S.mode = 'net';
  show('room');
  $('#roomK').textContent = '正在进这间房';
  $('#roomCode').textContent = code;
  roomStateUI('正在连中继…', '');
  S.net = net.connect(code, onNetMsg, onNetState);
  const hi = () => { if (S.room && S.room.state === 'wait' && S.net) S.net.send({ k: 'hi', role: 'b', ch: S.pick[0] }); };
  hi();
  clearInterval(S.hiTimer);
  S.hiTimer = setInterval(hi, 3000);
}

function onNetState(st) {
  if (!S.room) return;
  if (st === 'on') { if (S.room.state === 'wait') roomStateUI('房间里等对手进来…', ''); }
  if (st === 'err') roomStateUI('中继断了，正在重连…', 'bad');
}

function startNetGame(seed, chars, side) {
  clearInterval(S.hiTimer);
  S.hiTimer = 0;
  if (S.room) S.room.state = 'live';
  S.me = side;
  S.s = create(seed, chars, { best: S.best });
  S.token += 1;
  S.busy = false;
  S.remoteSeq = 0;
  hideOv();
  show('battle');
  renderBattle();
  afterAction();
}

function onNetMsg(p) {
  if (!p || !S.room) return;
  if (p.k === 'hi') {
    if (S.room.role === 'a' && p.role === 'b') {
      if (!CHARS[p.ch]) return;
      S.peer = p.ch;
      if (S.room.state !== 'wait') return;
      // 房主定种子、定双方唤醒体，然后先手
      const seed = newSeed();
      roomStateUI('对手进来了，开局！', 'ok');
      // 赛制由房主定，跟着 open 一起发过去
      S.net.send({ k: 'open', seed, a: S.pick[0], b: S.peer, best: S.best });
      startNetGame(seed, [S.pick[0], S.peer], 0);
    } else if (S.room.role === 'b' && p.role === 'a') {
      // 房主的握手：回一句，等他的 open
      S.net.send({ k: 'hi', role: 'b', ch: S.pick[0] });
      roomStateUI('房主在，等你进桌…', 'ok');
    }
    return;
  }
  if (p.k === 'open' && S.room.role === 'b') {
    if (!CHARS[p.a] || !CHARS[p.b]) { toast('对方的唤醒体不认识，可能是版本不一致'); return; }
    S.net.send({ k: 'ack' });
    S.best = Number(p.best) === 5 ? 5 : 3;   // 赛制以房主为准
    startNetGame(p.seed >>> 0, [p.a, p.b], 1);
    return;
  }
  if (p.k === 'act' && S.room.state === 'live') {
    if (p.n <= S.remoteSeq) return;
    S.remoteSeq = p.n;
    doAction(p.a, true);
    return;
  }
  if (p.k === 'bye') {
    toast('对手离开了房间');
    if (S.room) S.room.state = 'end';
    setTimeout(() => leaveRoom(), 900);
  }
}

function leaveRoom() {
  clearInterval(S.hiTimer);
  S.hiTimer = 0;
  if (S.net) { try { S.net.send({ k: 'bye' }); } catch (e) { /* 已经断了 */ } S.net.close(); }
  S.net = null; S.room = null; S.peer = null; S.s = null;
  S.token += 1;
  hideOv();
  show('home');
}

// ---------------------------------------------------------------- 说明弹层
function sheet(title, html) {
  $('#sheetTitle').textContent = title;
  $('#sheetBody').innerHTML = html;
  $('#sheet').hidden = false;
}
function closeSheet() { $('#sheet').hidden = true; }

function rulesHTML() {
  return `
  <h4>桌上那点事</h4>
  <ul>
    <li>开局前选赛制：<b>三局两胜</b>或<b>五局三胜</b>。每局开打前补满理智、重新发道具、重新装填。</li>
    <li>枪膛里的<b>实弹与空壳数量公开，顺序不知道</b>；打完一膛就按同样的数量重装、重洗。</li>
    <li><b>对自己开枪</b>：空壳＝不扣血，而且回合还归你，可以接着打（继续开枪或用道具）；实弹＝扣血，交回合。</li>
    <li><b>对对手开枪</b>：不管响没响，回合都交出去。</li>
    <li>道具只在自己的回合用，用道具<b>不消耗行动</b>——用完还能接着开枪。</li>
    <li>理智归零就输掉这一局；三局两胜先赢两局、五局三胜先赢三局的人赢下整场。</li>
    <li>先手逐局轮换：第一局房主 / 玩家一先手，第二局换人，第三局再换回来。</li>
  </ul>
  <h4>每局的子弹</h4>
  <div class="rulelist">
    ${roundsFor(3).map((r, i) => `<div class="row"><i>${i + 1}</i><div><b>三局两胜 · 第 ${i + 1} 局</b><span>　${r.live} 实弹 + ${r.blank} 空壳，双方各摸 ${r.items} 件道具</span></div></div>`).join('')}
    ${roundsFor(5).map((r, i) => `<div class="row"><i>${i + 1}</i><div><b>五局三胜 · 第 ${i + 1} 局</b><span>　${r.live} 实弹 + ${r.blank} 空壳，双方各摸 ${r.items} 件道具</span></div></div>`).join('')}
  </div>
  <h4>段位</h4>
  <p>只有人机对战记段位分（同屏和好友房不记）。段位表与「唤醒王：决斗链接」共用一套：见习守密人 → 铜钥级 → 银钥级 → 金印级 → 白夜级 → 命轮师 → 界域传说 → 唤醒大师 → 唤醒王。段位越高，人机至少按更高的档位打，也会挑更能打的唤醒体出场；输一局会给一点读档分，不会掉段。</p>
  <h4>道具</h4>
  <div class="rulelist">${ITEM_ORDER.map((id) => {
    const d = ITEMS[id];
    return `<div class="row"><i style="color:var(--gold)">${esc(d.g)}</i><div><b>${esc(d.n)}</b><span>　${esc(d.d)}</span></div></div>`;
  }).join('')}</div>
  <h4>唤醒体</h4>
  <div class="rulelist">${CHAR_ORDER.map((id) => {
    const c = CHARS[id];
    return `<div class="row"><i>${c.hp}</i><div><b>${esc(c.n)}</b><span>　理智 ${c.hp} · 随身 ${c.items.map((x) => esc(ITEMS[x].n)).join('、')} · ${esc(c.passive.n)}：${esc(c.passive.d)}</span></div></div>`;
  }).join('')}</div>
  <h4>好友房</h4>
  <p>房间码 5 位（去掉了 I O 0 1，念出来不会错）。房间靠公共中继转发消息，两边只传「动作」，不传整局状态——所以断线重连不会让两边算错账。同屏双人是「明牌」：窥镜看出来的东西两个人都会看见，这一点在同一个屏幕上没法藏。</p>`;
}

function itemsHTML() {
  const cls = { info: 'var(--blue)', heal: 'var(--green)', atk: 'var(--red2)', ctrl: 'var(--violet)', util: 'var(--gold)' };
  return `<p>通用道具每局从池子里随机摸；专属道具只会跟着对应唤醒体上场，不进随机池。</p>
  <div class="rulelist">${ITEM_ORDER.map((id) => {
    const d = ITEMS[id];
    const own = CHAR_ORDER.filter((c) => CHARS[c].items.indexOf(id) >= 0);
    return `<div class="row"><i style="color:${cls[d.c] || 'var(--gold)'}">${esc(d.g)}</i>
      <div><b>${esc(d.n)}</b>${own.length ? `<span style="color:var(--dim2)">（${own.length} 人随身：${own.slice(0, 3).map((c) => esc(CHARS[c].n)).join('、')}${own.length > 3 ? ' 等' : ''}）</span>` : ''}
      <span><br>${esc(d.d)}</span></div></div>`;
  }).join('')}</div>`;
}

// ---------------------------------------------------------------- 小提示条
let toastTimer = 0;
function toast(txt) {
  const el = $('#toast');
  el.textContent = txt;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 1700);
}

// ---------------------------------------------------------------- 事件绑定
function bind() {
  for (const b of document.querySelectorAll('.mode')) {
    b.addEventListener('click', () => {
      const mode = b.dataset.mode;
      S.mode = mode;
      S.pick = [null, null];
      S.picking = 0;
      S.expect = mode === 'hot' ? 2 : 1;
      sfx.init(); sfx.click();
      show('pick');
    });
  }
  $('#diffRow').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-diff]');
    if (!b) return;
    S.diff = b.dataset.diff;
    lsSet('zjtt:roulette:diff', S.diff);
    renderHome(); sfx.click();
  });
  $('#bestRow').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-best]');
    if (!b) return;
    S.best = Number(b.dataset.best) === 5 ? 5 : 3;
    lsSet('zjtt:roulette:best', String(S.best));
    renderHome(); sfx.click();
  });
  $('#pickTabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    S.tab = b.dataset.tab;
    S.picking = S.picking; // 选到一半换筛选不影响已选的人
    renderPick(); sfx.click();
  });
  $('#pickSearch').addEventListener('input', (e) => {
    S.q = e.target.value || '';
    renderPick();
  });
  $('#pickGrid').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-pick]');
    if (!b) return;
    pickChar(b.dataset.pick);
  });
  $('#pickGo').addEventListener('click', () => { sfx.click(); pickNext(); });
  $('#pickBack').addEventListener('click', () => {
    sfx.click();
    if (S.picking > 0) { S.picking -= 1; renderPick(); } else { S.pick = [null, null]; show('home'); }
  });

  $('#shootSelf').addEventListener('click', () => { sfx.init(); doAction({ t: 'shoot', target: 'self' }); });
  $('#shootFoe').addEventListener('click', () => { sfx.init(); doAction({ t: 'shoot', target: 'foe' }); });
  $('#myChips').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-uid]');
    if (!b) return;
    sfx.init();
    doAction({ t: 'item', uid: Number(b.dataset.uid) });
  });

  $('#btnRules').addEventListener('click', () => sheet('怎么玩', rulesHTML()));
  $('#btnRule2').addEventListener('click', () => sheet('怎么玩', rulesHTML()));
  $('#btnItems').addEventListener('click', () => sheet('道具图鉴', itemsHTML()));
  $('#btnItems2').addEventListener('click', () => sheet('道具图鉴', itemsHTML()));
  $('#sheetClose').addEventListener('click', closeSheet);
  $('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });

  $('#btnMute').addEventListener('click', () => {
    S.muted = !S.muted;
    lsSet('zjtt:roulette:mute', S.muted ? '1' : '');
    $('#btnMute').classList.toggle('off', S.muted);
    if (!S.muted) { sfx.init(); sfx.click(); }
  });

  $('#ovAgain').addEventListener('click', () => {
    hideOv();
    if (S.mode === 'net') { leaveRoom(); return; }
    if (S.mode === 'hot') { S.picking = 0; S.expect = 2; S.pick = [null, null]; show('pick'); return; }
    // 人机：同一对人马换个种子再打
    const chars = S.s ? [S.s.chars[0], S.s.chars[1]] : null;
    if (chars) startMatch(chars, S.me); else show('home');
  });

  $('#roomCopy').addEventListener('click', () => {
    const code = S.room ? S.room.code : '';
    if (!code) return;
    const done = () => toast('房间码已复制：' + code);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done).catch(() => toast('复制失败，手动念一下：' + code));
    } else toast('房间码：' + code);
  });
  $('#roomQuit').addEventListener('click', leaveRoom);

  window.addEventListener('beforeunload', () => {
    if (S.net) { try { S.net.send({ k: 'bye' }); } catch (e) { /* 来不及了 */ } }
  });
}

// ---------------------------------------------------------------- 启动
function mount() {
  loadStats();
  S.muted = lsPick('zjtt:roulette:mute', OLD_KEYS.mute) === '1';
  $('#btnMute').classList.toggle('off', S.muted);
  const d = lsPick('zjtt:roulette:diff', OLD_KEYS.diff);
  if (DIFFS.some((x) => x.k === d)) S.diff = d;
  const b = Number(lsPick('zjtt:roulette:best', OLD_KEYS.best));
  S.best = b === 5 ? 5 : 3;

  $('#gun').innerHTML = gunSVG();
  $('#heroGun').innerHTML = gunSVG();

  bind();
  renderHome();
  show('home');
  const boot = document.getElementById('boot');
  if (boot) boot.remove();
}
return { mount };
})();

// ---- js/roulette.js
const m_roulette = await (async () => {
const { mount } = m_view;
// 弥萨格轮盘 · 页面入口。
//
// 只做一件事：把界面挂起来。规则在 engine.js，对手在 ai.js，房间在 net.js，
// 页面本身（src/pages/roulette.html）只有壳和样式——构建时这几层会被打成一个脚本。


mount();
return {  };
})();

})().catch(function (e) {
  if (window.__bootFailed) window.__bootFailed((e && e.message) || String(e));
  else if (window.console) console.error(e);
});
// 主脚本已经跑起来了（给 HTML 里的看门狗一个准信号，替代原来的顶层 await 探测）
window.__bootMain = 1;

