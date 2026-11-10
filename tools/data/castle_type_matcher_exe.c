==== FUN_00ab4360 @ 00ab4360 depth 0

bool __thiscall FUN_00ab4360(int param_1,int param_2,int param_3)

{
  int iVar1;
  bool bVar2;
  
  iVar1 = param_2;
  if (param_2 == 0) {
    return false;
  }
  param_2 = *(int *)(param_1 + 0x1e0);
  FUN_00411370(&param_2,&param_3);
  switch(param_3 + -1) {
  case 0:
    return param_2 == 1;
  case 1:
    return param_2 == 2;
  case 2:
    return param_2 == 3;
  case 3:
    return param_2 == 4;
  case 4:
    return param_2 == 8;
  }
  switch(iVar1 + -1) {
  case 0:
    if (param_2 == 1) {
      return true;
    }
    if (param_2 == 0xe) {
      return true;
    }
    bVar2 = param_2 == 5;
    goto LAB_00ab43f6;
  case 1:
    if (param_2 == 2) {
      return true;
    }
    if (param_2 == 6) {
      return true;
    }
    if (param_2 == 10) {
      return true;
    }
    if (param_2 == 0xe) {
      return true;
    }
    bVar2 = param_2 == 0xf;
    break;
  case 2:
    if (param_2 == 3) {
      return true;
    }
    if (param_2 == 7) {
      return true;
    }
    if (param_2 == 0xf) {
      return true;
    }
    bVar2 = param_2 == 0xb;
    break;
  case 3:
    if (param_2 == 4) {
      return true;
    }
    if (param_2 == 5) {
      return true;
    }
    if (param_2 == 6) {
      return true;
    }
    if (param_2 == 7) {
      return true;
    }
    bVar2 = param_2 == 0xc;
    break;
  case 4:
    if (param_2 == 1) {
      return true;
    }
    if (param_2 == 4) {
      return true;
    }
    bVar2 = param_2 == 5;
    break;
  case 5:
    if (param_2 == 2) {
      return true;
    }
    if (param_2 == 4) {
      return true;
    }
    bVar2 = param_2 == 6;
    break;
  case 6:
    if (param_2 == 3) {
      return true;
    }
    if (param_2 == 4) {
      return true;
    }
    bVar2 = param_2 == 7;
    break;
  case 7:
    if (param_2 == 8) {
      return true;
    }
    if (param_2 == 9) {
      return true;
    }
    if (param_2 == 10) {
      return true;
    }
    if (param_2 == 0xb) {
      return true;
    }
    if (param_2 == 0xc) {
      return true;
    }
    bVar2 = param_2 == 0xd;
    break;
  case 8:
    if (param_2 == 1) {
      return true;
    }
    bVar2 = param_2 == 8;
LAB_00ab43f6:
    if (bVar2) {
      return true;
    }
    bVar2 = param_2 == 9;
    break;
  case 9:
    if (param_2 == 2) {
      return true;
    }
    if (param_2 == 8) {
      return true;
    }
    bVar2 = param_2 == 10;
    break;
  case 10:
    if (param_2 == 3) {
      return true;
    }
    if (param_2 == 8) {
      return true;
    }
    bVar2 = param_2 == 0xb;
    break;
  case 0xb:
    if (param_2 == 4) {
      return true;
    }
    if (param_2 == 8) {
      return true;
    }
    bVar2 = param_2 == 0xc;
    break;
  case 0xc:
  case 0xf:
    if (param_2 == 0xd) {
      return true;
    }
    bVar2 = param_2 == 0x10;
    break;
  case 0xd:
    if (param_2 == 1) {
      return true;
    }
    if (param_2 == 2) {
      return true;
    }
    bVar2 = param_2 == 0xe;
    break;
  case 0xe:
    if (param_2 == 3) {
      return true;
    }
    if (param_2 == 2) {
      return true;
    }
    bVar2 = param_2 == 0xf;
    break;
  default:
    goto switchD_00ab43df_default;
  }
  if (bVar2) {
    return true;
  }
switchD_00ab43df_default:
  return false;
}


